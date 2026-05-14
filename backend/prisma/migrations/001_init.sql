-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'TREASURY');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KycLevel" AS ENUM ('NONE', 'BASIC', 'FULL');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('DEPOSITING', 'PENDING_PAYOUT', 'COMPLETED', 'PAYOUT_FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AirtimeStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "aptosAddress" TEXT,
    "evmAddress" TEXT,
    "suiAddress" TEXT,
    "bankCode" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountName" TEXT,
    "preferredCurrency" TEXT DEFAULT 'NGN',
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NONE',
    "kycLevel" "KycLevel" NOT NULL DEFAULT 'NONE',
    "kycJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow_orders" (
    "id" TEXT NOT NULL,
    "aptosEventSeq" TEXT,
    "suiOrderId" TEXT,
    "txHash" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amountRaw" TEXT NOT NULL,
    "recordId" TEXT,
    "currencyOut" TEXT DEFAULT 'NGN',
    "amountOut" DOUBLE PRECISION,
    "timeoutEpoch" BIGINT,
    "chain" TEXT DEFAULT 'aptos',
    "ngnAmount" DOUBLE PRECISION,
    "payoutRef" TEXT,
    "payoutProvider" TEXT,
    "status" "EscrowStatus" NOT NULL DEFAULT 'DEPOSITING',
    "failureReason" TEXT,
    "userId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escrow_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swap_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetIn" TEXT NOT NULL,
    "assetOut" TEXT NOT NULL,
    "amountIn" DOUBLE PRECISION NOT NULL,
    "amountOut" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "slippageBps" INTEGER NOT NULL DEFAULT 50,
    "txHash" TEXT,
    "chain" TEXT DEFAULT 'sui',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "swap_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airtime_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "payAsset" TEXT NOT NULL DEFAULT 'USDC',
    "cryptoCost" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "status" "AirtimeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "airtime_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_snapshots" (
    "id" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "usdPrice" DOUBLE PRECISION NOT NULL,
    "ngnRate" DOUBLE PRECISION NOT NULL,
    "ghsRate" DOUBLE PRECISION,
    "kesRate" DOUBLE PRECISION,
    "xofRate" DOUBLE PRECISION,
    "xafRate" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'pyth',
    "chain" TEXT DEFAULT 'sui',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_logs" (
    "id" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chain" TEXT NOT NULL DEFAULT 'sui',
    "onChainBalance" DOUBLE PRECISION NOT NULL,
    "dbBalance" DOUBLE PRECISION NOT NULL,
    "discrepancy" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "reconciliation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_health_logs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "latencyMs" INTEGER,
    "errorMessage" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_health_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_letter_orders" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "recordId" TEXT,
    "reason" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dead_letter_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_aptosAddress_key" ON "users"("aptosAddress");

-- CreateIndex
CREATE UNIQUE INDEX "users_evmAddress_key" ON "users"("evmAddress");

-- CreateIndex
CREATE UNIQUE INDEX "users_suiAddress_key" ON "users"("suiAddress");

-- CreateIndex
CREATE INDEX "users_aptosAddress_idx" ON "users"("aptosAddress");

-- CreateIndex
CREATE INDEX "users_evmAddress_idx" ON "users"("evmAddress");

-- CreateIndex
CREATE INDEX "users_suiAddress_idx" ON "users"("suiAddress");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_orders_aptosEventSeq_key" ON "escrow_orders"("aptosEventSeq");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_orders_suiOrderId_key" ON "escrow_orders"("suiOrderId");

-- CreateIndex
CREATE INDEX "escrow_orders_userAddress_idx" ON "escrow_orders"("userAddress");

-- CreateIndex
CREATE INDEX "escrow_orders_status_idx" ON "escrow_orders"("status");

-- CreateIndex
CREATE INDEX "escrow_orders_payoutRef_idx" ON "escrow_orders"("payoutRef");

-- CreateIndex
CREATE INDEX "escrow_orders_recordId_idx" ON "escrow_orders"("recordId");

-- CreateIndex
CREATE INDEX "escrow_orders_currencyOut_idx" ON "escrow_orders"("currencyOut");

-- CreateIndex
CREATE INDEX "swap_records_userId_idx" ON "swap_records"("userId");

-- CreateIndex
CREATE INDEX "airtime_transactions_userId_idx" ON "airtime_transactions"("userId");

-- CreateIndex
CREATE INDEX "price_snapshots_asset_createdAt_idx" ON "price_snapshots"("asset", "createdAt");

-- CreateIndex
CREATE INDEX "provider_health_logs_provider_currency_checkedAt_idx" ON "provider_health_logs"("provider", "currency", "checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "dead_letter_orders_orderId_key" ON "dead_letter_orders"("orderId");

-- AddForeignKey
ALTER TABLE "escrow_orders" ADD CONSTRAINT "escrow_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_records" ADD CONSTRAINT "swap_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airtime_transactions" ADD CONSTRAINT "airtime_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

