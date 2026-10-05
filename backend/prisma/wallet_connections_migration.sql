-- Additive and repeatable: only creates storage for verified wallet links.
CREATE TABLE IF NOT EXISTS "linked_wallets" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "chain" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "linked_wallets_chain_address_key" UNIQUE ("chain", "address")
);
CREATE INDEX IF NOT EXISTS "linked_wallets_userId_idx" ON "linked_wallets"("userId");
