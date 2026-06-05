/**
 * Backfill HashPay account numbers + wallets for existing users.
 * ─────────────────────────────────────────────────────────────
 * Any user who registered before the wallet system was added has
 * `hashpayAccountNumber = NULL` and no Wallet row. This script
 * fixes that for every such user — idempotent, safe to re-run.
 *
 * Run:
 *   cd backend
 *   DATABASE_URL="<railway public url>" npx tsx src/scripts/backfillAccountNumbers.ts
 */
import { prisma } from '../config/database'

async function generateUniqueAccountNumber(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const num = String(Math.floor(1000000000 + Math.random() * 9000000000))
    const exists = await prisma.user.findUnique({ where: { hashpayAccountNumber: num } })
    if (!exists) return num
  }
  throw new Error('Failed to generate a unique account number after 20 attempts')
}

async function main() {
  console.log('🔍 Scanning for users without a HashPay account number…')

  const users = await prisma.user.findMany({
    where: { OR: [{ hashpayAccountNumber: null }, { wallet: { is: null } }] },
    select: { id: true, email: true, hashpayAccountNumber: true, wallet: { select: { id: true } } },
  })

  if (users.length === 0) {
    console.log('✅ All users already have an account number + wallet. Nothing to do.')
    return
  }

  console.log(`📋 Found ${users.length} user(s) needing a backfill.\n`)

  let accountsCreated = 0
  let walletsCreated  = 0

  for (const user of users) {
    const data: { hashpayAccountNumber?: string; wallet?: { create: { ngnBalance: number } } } = {}

    // Generate an account number if missing
    if (!user.hashpayAccountNumber) {
      data.hashpayAccountNumber = await generateUniqueAccountNumber()
      accountsCreated++
    }

    // Create a wallet if missing
    if (!user.wallet) {
      data.wallet = { create: { ngnBalance: 0 } }
      walletsCreated++
    }

    await prisma.user.update({ where: { id: user.id }, data })

    console.log(
      `  ✓ ${user.email} → account: ${data.hashpayAccountNumber ?? user.hashpayAccountNumber}` +
      `${data.wallet ? ' (+wallet)' : ''}`,
    )
  }

  console.log(`\n✅ Backfill complete.`)
  console.log(`   Account numbers created: ${accountsCreated}`)
  console.log(`   Wallets created:         ${walletsCreated}`)
}

main()
  .catch((err) => { console.error('❌ Backfill failed:', err); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
