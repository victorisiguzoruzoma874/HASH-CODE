-- Additive and repeatable: KYC tiers, submissions, documents and audit log.
DO $$ BEGIN
  CREATE TYPE "KycSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_MORE_INFO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "KycDocumentType" AS ENUM ('ID_FRONT', 'ID_BACK', 'SELFIE', 'ADDRESS_PROOF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "kycTier" INTEGER NOT NULL DEFAULT 0;
-- Backfill once from the legacy columns (only touches rows still at tier 0).
UPDATE "users" SET "kycTier" = CASE
  WHEN "kycStatus" = 'APPROVED' AND "kycLevel" = 'FULL'  THEN 3
  WHEN "kycStatus" = 'APPROVED' AND "kycLevel" = 'BASIC' THEN 1
  ELSE 0 END
WHERE "kycTier" = 0;

CREATE TABLE IF NOT EXISTS "kyc_submissions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tier" INTEGER NOT NULL,
  "status" "KycSubmissionStatus" NOT NULL DEFAULT 'PENDING',
  "providerJobId" TEXT,
  "encryptedData" TEXT,
  "rejectionReason" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kyc_submissions_providerJobId_key" UNIQUE ("providerJobId")
);
CREATE INDEX IF NOT EXISTS "kyc_submissions_userId_status_idx" ON "kyc_submissions"("userId", "status");

CREATE TABLE IF NOT EXISTS "kyc_documents" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "submissionId" TEXT NOT NULL REFERENCES "kyc_submissions"("id") ON DELETE CASCADE,
  "type" "KycDocumentType" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "kyc_documents_submissionId_idx" ON "kyc_documents"("submissionId");

CREATE TABLE IF NOT EXISTS "kyc_audit_log" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "submissionId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "kyc_audit_log_submissionId_idx" ON "kyc_audit_log"("submissionId");
