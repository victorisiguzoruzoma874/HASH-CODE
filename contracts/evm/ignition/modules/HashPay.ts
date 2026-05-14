import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

// Mainnet addresses
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const USDC_MAINNET      = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const USDT_MAINNET      = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const WETH_MAINNET      = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

export default buildModule('HashPayModule', (m) => {
  const treasury = m.getParameter('treasury', m.getAccount(0))

  // 1. Deploy escrow
  const escrow = m.contract('HashPayEscrow', [treasury])

  // 2. Whitelist tokens
  m.call(escrow, 'setSupportedToken', [USDC_MAINNET, true], { id: 'whitelistUSDC' })
  m.call(escrow, 'setSupportedToken', [USDT_MAINNET, true], { id: 'whitelistUSDT' })
  m.call(escrow, 'setSupportedToken', [WETH_MAINNET, true], { id: 'whitelistWETH' })

  // 3. Deploy swap router
  const swap = m.contract('HashPaySwap', [UNISWAP_V3_ROUTER, escrow, treasury])

  return { escrow, swap }
})
