import { expect }                    from 'chai'
import { ethers }                    from 'hardhat'
import { loadFixture }               from '@nomicfoundation/hardhat-toolbox/network-helpers'
import type { HashPayEscrow }        from '../typechain-types'
import type { SignerWithAddress }    from '@nomicfoundation/hardhat-ethers/signers'

// ── Helpers ──────────────────────────────────────────────────

function orderId(n: number): string {
  return ethers.zeroPadValue(ethers.toBeHex(n), 32)
}

// ── Fixture ──────────────────────────────────────────────────

async function deployFixture() {
  const [owner, treasury, user, attacker] = await ethers.getSigners()

  // Deploy mock ERC-20 (USDC)
  const MockToken = await ethers.getContractFactory('MockERC20')
  const usdc      = await MockToken.deploy('USD Coin', 'USDC', 6)

  // Deploy escrow
  const Escrow = await ethers.getContractFactory('HashPayEscrow')
  const escrow = await Escrow.deploy(treasury.address) as HashPayEscrow

  // Whitelist USDC
  await escrow.setSupportedToken(await usdc.getAddress(), true)

  // Mint USDC to user
  await usdc.mint(user.address, ethers.parseUnits('10000', 6))

  // Approve escrow
  await usdc.connect(user).approve(
    await escrow.getAddress(),
    ethers.parseUnits('10000', 6),
  )

  return { escrow, usdc, owner, treasury, user, attacker }
}

// ── Tests ─────────────────────────────────────────────────────

describe('HashPayEscrow', () => {

  describe('Deployment', () => {
    it('sets treasury correctly', async () => {
      const { escrow, treasury } = await loadFixture(deployFixture)
      expect(await escrow.treasury()).to.equal(treasury.address)
    })

    it('sets default fee to 50 bps', async () => {
      const { escrow } = await loadFixture(deployFixture)
      expect(await escrow.feeBps()).to.equal(50n)
    })
  })

  describe('deposit()', () => {
    it('locks funds and emits DepositReceived', async () => {
      const { escrow, usdc, user } = await loadFixture(deployFixture)
      const amount  = ethers.parseUnits('100', 6)
      const oid     = orderId(1)

      await expect(escrow.connect(user).deposit(await usdc.getAddress(), amount, oid))
        .to.emit(escrow, 'DepositReceived')
        .withArgs(oid, user.address, await usdc.getAddress(), amount, amount * 9950n / 10000n, amount * 50n / 10000n, await ethers.provider.getBlock('latest').then(b => b!.timestamp + 1))

      const order = await escrow.getOrder(oid)
      expect(order.status).to.equal(1)  // PENDING
      expect(order.user).to.equal(user.address)
    })

    it('reverts on duplicate orderId', async () => {
      const { escrow, usdc, user } = await loadFixture(deployFixture)
      const amount = ethers.parseUnits('100', 6)
      const oid    = orderId(1)

      await escrow.connect(user).deposit(await usdc.getAddress(), amount, oid)
      await expect(
        escrow.connect(user).deposit(await usdc.getAddress(), amount, oid)
      ).to.be.revertedWith('Order already exists')
    })

    it('reverts for unsupported token', async () => {
      const { escrow, user } = await loadFixture(deployFixture)
      await expect(
        escrow.connect(user).deposit(ethers.ZeroAddress, 100n, orderId(1))
      ).to.be.revertedWith('Token not supported')
    })
  })

  describe('release()', () => {
    it('transfers funds to treasury and emits OrderReleased', async () => {
      const { escrow, usdc, owner, treasury, user } = await loadFixture(deployFixture)
      const amount = ethers.parseUnits('100', 6)
      const oid    = orderId(1)

      await escrow.connect(user).deposit(await usdc.getAddress(), amount, oid)
      const netAmount = amount * 9950n / 10000n

      const treasuryBalBefore = await usdc.balanceOf(treasury.address)
      await expect(escrow.connect(owner).release(oid, 'FLW-REF-001'))
        .to.emit(escrow, 'OrderReleased')

      const treasuryBalAfter = await usdc.balanceOf(treasury.address)
      expect(treasuryBalAfter - treasuryBalBefore).to.equal(netAmount)

      const order = await escrow.getOrder(oid)
      expect(order.status).to.equal(2)  // RELEASED
      expect(order.payoutRef).to.equal('FLW-REF-001')
    })

    it('reverts if called by non-owner', async () => {
      const { escrow, usdc, user, attacker } = await loadFixture(deployFixture)
      const oid = orderId(1)
      await escrow.connect(user).deposit(await usdc.getAddress(), ethers.parseUnits('100', 6), oid)
      await expect(
        escrow.connect(attacker).release(oid, 'hack')
      ).to.be.revertedWithCustomError(escrow, 'OwnableUnauthorizedAccount')
    })
  })

  describe('refund()', () => {
    it('returns funds to user and emits OrderRefunded', async () => {
      const { escrow, usdc, owner, user } = await loadFixture(deployFixture)
      const amount = ethers.parseUnits('100', 6)
      const oid    = orderId(1)

      await escrow.connect(user).deposit(await usdc.getAddress(), amount, oid)
      const netAmount = amount * 9950n / 10000n

      const userBalBefore = await usdc.balanceOf(user.address)
      await expect(escrow.connect(owner).refund(oid, 'KYC_FAILED'))
        .to.emit(escrow, 'OrderRefunded')

      const userBalAfter = await usdc.balanceOf(user.address)
      expect(userBalAfter - userBalBefore).to.equal(netAmount)
    })
  })

  describe('Admin', () => {
    it('owner can update fee', async () => {
      const { escrow, owner } = await loadFixture(deployFixture)
      await escrow.connect(owner).setFeeBps(100)
      expect(await escrow.feeBps()).to.equal(100n)
    })

    it('reverts if fee > 500 bps', async () => {
      const { escrow, owner } = await loadFixture(deployFixture)
      await expect(escrow.connect(owner).setFeeBps(501)).to.be.revertedWith('Fee too high')
    })

    it('owner can pause and unpause', async () => {
      const { escrow, usdc, owner, user } = await loadFixture(deployFixture)
      await escrow.connect(owner).pause()
      await expect(
        escrow.connect(user).deposit(await usdc.getAddress(), 100n, orderId(1))
      ).to.be.revertedWithCustomError(escrow, 'EnforcedPause')

      await escrow.connect(owner).unpause()
      // Should not revert now
    })
  })
})
