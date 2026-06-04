-- Add new columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hashpayAccountNumber" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "virtualAccountNumber" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "virtualBankName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "virtualBankCode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "virtualAccountRef" TEXT;

-- Add new enums
DO $$ BEGIN
  CREATE TYPE "WalletTxType" AS ENUM ('CREDIT', 'DEBIT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WalletTxStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WalletTxSource" AS ENUM ('CRYPTO_DEPOSIT', 'INTERNAL_TRANSFER_IN', 'INTERNAL_TRANSFER_OUT', 'WITHDRAWAL', 'REVERSAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create wallets table
CREATE TABLE IF NOT EXISTS "wallets" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ngnBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "type" "WalletTxType" NOT NULL,
  "source" "WalletTxSource" NOT NULL,
  "status" "WalletTxStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(18,2) NOT NULL,
  "balanceBefore" DECIMAL(18,2) NOT NULL,
  "balanceAfter" DECIMAL(18,2) NOT NULL,
  "senderId" TEXT,
  "recipientId" TEXT,
  "paycrestOrderId" TEXT,
  "cryptoAsset" TEXT,
  "cryptoAmount" DECIMAL(18,8),
  "exchangeRate" DECIMAL(18,4),
  "bankAccountNumber" TEXT,
  "bankName" TEXT,
  "reference" TEXT,
  "description" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_hashpayAccountNumber_key" ON "users"("hashpayAccountNumber");
CREATE INDEX IF NOT EXISTS "users_hashpayAccountNumber_idx" ON "users"("hashpayAccountNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_userId_key" ON "wallets"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_transactions_paycrestOrderId_key" ON "wallet_transactions"("paycrestOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_transactions_reference_key" ON "wallet_transactions"("reference");
CREATE INDEX IF NOT EXISTS "wallet_transactions_walletId_idx" ON "wallet_transactions"("walletId");
CREATE INDEX IF NOT EXISTS "wallet_transactions_senderId_idx" ON "wallet_transactions"("senderId");
CREATE INDEX IF NOT EXISTS "wallet_transactions_recipientId_idx" ON "wallet_transactions"("recipientId");
CREATE INDEX IF NOT EXISTS "wallet_transactions_paycrestOrderId_idx" ON "wallet_transactions"("paycrestOrderId");
CREATE INDEX IF NOT EXISTS "wallet_transactions_status_idx" ON "wallet_transactions"("status");

-- Foreign keys
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
