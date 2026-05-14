#!/bin/bash
# HashPay Sui Contract Deployment Script
# Usage: ./scripts/deploy.sh [testnet|mainnet]

set -e

NETWORK=${1:-testnet}
echo "Deploying HashPay contracts to Sui $NETWORK..."

# ── 1. Switch network ────────────────────────────────────────
sui client switch --env $NETWORK

# ── 2. Check active address ──────────────────────────────────
DEPLOYER=$(sui client active-address)
echo "Deployer address: $DEPLOYER"

# ── 3. Publish package ──────────────────────────────────────
echo "Publishing package..."
PUBLISH_OUTPUT=$(sui client publish \
  --gas-budget 200000000 \
  --json \
  2>&1)

echo "$PUBLISH_OUTPUT" | tee deploy_output.json

# ── 4. Extract package ID ────────────────────────────────────
PACKAGE_ID=$(echo "$PUBLISH_OUTPUT" | \
  python3 -c "import sys,json; data=json.load(sys.stdin); \
  [print(obj['packageId']) for obj in data.get('objectChanges',[]) \
  if obj.get('type')=='published']" 2>/dev/null || \
  echo "Extract manually from deploy_output.json")

echo ""
echo "════════════════════════════════════════"
echo "  Deployment complete"
echo "  Package ID : $PACKAGE_ID"
echo "  Network    : $NETWORK"
echo "════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Update Move.toml: set hashpay = \"$PACKAGE_ID\""
echo "  2. Update backend .env: SUI_PACKAGE_ID=$PACKAGE_ID"
echo "  3. Transfer BackendCap to your backend hot wallet:"
echo "     sui client transfer --to <BACKEND_WALLET> --object-id <BACKEND_CAP_ID>"
echo "  4. Call quote_manager::set_backend_pubkey with your backend secp256k1 pubkey"
echo "  5. Call quote_manager::update_rates with initial rates"
