# HashPay Global

> **Kinetic Ether** — Fast, secure, decentralised DeFi payments on SUI + Ethereum.

HashPay is a full-stack Web3 fintech platform for the African market. Users can swap, send, and convert crypto assets across chains, pay bills, buy airtime/data, and settle directly to bank accounts in NGN, GHS, KES, XOF, and XAF.

---

## Monorepo Structure

```
hashpay/
├── frontend/               # React 18 + TypeScript + Tailwind CSS + Vite
│   └── src/
│       ├── components/     # UI components (dashboard, modals, ui primitives)
│       ├── pages/          # Route pages (Landing, Login, Signup, Dashboard, ...)
│       ├── store/          # Zustand state (useStore, useApiStore)
│       └── lib/            # API client (typed fetch + mock mode)
│
├── backend/                # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/         # REST endpoints (auth, swap, escrow, payout, ...)
│   │   ├── services/       # Core logic
│   │   │   ├── sui/        # SuiEscrowListener, SuiTransactionService
│   │   │   ├── evm/        # EvmEscrowListener (Ethereum)
│   │   │   ├── escrow/     # Aptos EscrowListener (legacy)
│   │   │   ├── payout/     # CurrencyRouter + Afriex/Opay/Flipeet providers
│   │   │   ├── oracle/     # PriceOracleService (Pyth → CoinGecko)
│   │   │   └── kyc/        # KycService (Smile ID)
│   │   ├── jobs/           # suiPriceKeeper, reconciliation, priceKeeper
│   │   ├── config/         # DB, Redis, Sui, Aptos, EVM clients
│   │   └── utils/          # logger, crypto, quoteSign (secp256k1)
│   └── prisma/
│       └── schema.prisma   # PostgreSQL schema
│
└── contracts/
    ├── sui/                # Sui Move contracts (PRIMARY)
    │   ├── sources/
    │   │   ├── escrow.move         # Vault + deposit/refund/release + secp256k1 sig
    │   │   └── quote_manager.move  # RateStore + signed quote verification
    │   └── tests/escrow_tests.move
    ├── move/               # Aptos Move contracts (LEGACY)
    │   └── sources/
    │       ├── escrow.move
    │       ├── swap_manager.move   # DEX-ready (Liquidswap stub)
    │       └── oracle_price.move
    └── evm/                # Ethereum Solidity contracts
        └── contracts/
            ├── HashPayEscrow.sol   # ERC-20 + ETH escrow
            └── HashPaySwap.sol     # Uniswap V3 swap → escrow
```

---

## Quick Start

### 1. Frontend (demo mode — no backend needed)

```bash
cd frontend
# .env already has VITE_MOCK_API=true
npm install
npm run dev
# → http://localhost:5173
```

Mock mode lets you use the full UI with simulated API responses. Login/signup work, dashboard loads, all modals function.

### 2. Frontend + Backend (full stack)

```bash
# Terminal 1 — start PostgreSQL and Redis (Docker)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=hashpay123 -e POSTGRES_USER=hashpay -e POSTGRES_DB=hashpay_db postgres:15
docker run -d -p 6379:6379 redis:7

# Terminal 2 — backend
cd backend
cp .env.example .env   # already done — .env exists
npx prisma migrate dev --name init
npm run dev
# → http://localhost:4000

# Terminal 3 — frontend (switch off mock mode)
cd frontend
# Edit .env: set VITE_MOCK_API=false
npm run dev
# → http://localhost:5173
```

### 3. Sui contracts (testnet)

```bash
cd contracts/sui
# Install Sui CLI: https://docs.sui.io/guides/developer/getting-started/sui-install
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env testnet
bash scripts/deploy.sh testnet
```

### 4. EVM contracts (Sepolia testnet)

```bash
cd contracts/evm
npm install
cp ../../backend/.env .env   # reuse backend env
npx hardhat compile
npx hardhat test
npx hardhat ignition deploy ignition/modules/HashPay.ts --network sepolia
```

---

## Architecture

```
User Browser (React + Sui dapp-kit)
         │
         │ REST API (JWT)          WebSocket (Sui events)
         ▼                                  │
┌─────────────────────────────────────────────────────────┐
│  Backend (Express + TypeScript)                         │
│                                                         │
│  Routes: /auth /swap /escrow /payout /price /kyc        │
│                                                         │
│  Services:                                              │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │ SuiEscrowListener│  │ EvmEscrowListener            │  │
│  │ (WebSocket sub) │  │ (ethers.js event filter)     │  │
│  └────────┬────────┘  └──────────────┬───────────────┘  │
│           │                          │                   │
│           └──────────┬───────────────┘                   │
│                      ▼                                   │
│              CurrencyRouter                              │
│         ┌────────────┼────────────┐                      │
│         ▼            ▼            ▼                      │
│      Afriex        Opay        Flipeet                   │
│    (NGN/GHS/KES) (NGN fast)  (XOF/XAF/GHS)              │
│                                                          │
│  Jobs: SuiPriceKeeper (30s) | Reconciliation (daily)    │
└─────────────────────────────────────────────────────────┘
         │ Sui SDK                  │ ethers.js
         ▼                          ▼
┌─────────────────┐      ┌──────────────────────┐
│  Sui Mainnet    │      │  Ethereum Mainnet     │
│  escrow.move    │      │  HashPayEscrow.sol    │
│  quote_manager  │      │  HashPaySwap.sol      │
└─────────────────┘      └──────────────────────┘
```

### Hybrid Settlement Flow (Crypto → NGN)

```
1. Frontend calls /escrow/quote → gets signed quote (secp256k1)
2. User signs deposit_and_lock<USDC>(coin, orderId, "NGN", amountOut, expiry, sig)
3. Sui: verifies sig, locks USDC in EscrowRecord, emits DepositEvent
4. Backend SuiEscrowListener receives event via WebSocket
5. KYC check → CurrencyRouter → Afriex/Opay/Flipeet API
6. Fiat sent to user's bank account
7. Backend calls mark_paid() on Sui → EscrowRecord.status = PAID
8. On failure: Bull retry queue (4 attempts, exponential backoff)
9. After all retries: admin_refund() returns USDC to user
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/api/v1/health` | — | Health check |
| `POST` | `/api/v1/auth/register` | — | Register |
| `POST` | `/api/v1/auth/login` | — | Login |
| `POST` | `/api/v1/auth/connect-wallet` | JWT | Link Sui/Aptos/EVM wallet |
| `GET`  | `/api/v1/auth/me` | JWT | Current user |
| `POST` | `/api/v1/escrow/quote` | JWT | Signed conversion quote |
| `GET`  | `/api/v1/escrow/orders` | JWT | User's escrow orders |
| `GET`  | `/api/v1/escrow/stats` | JWT | Conversion stats |
| `POST` | `/api/v1/swap/quote` | JWT | Swap quote |
| `POST` | `/api/v1/swap/build-tx` | JWT | Build unsigned Sui tx |
| `POST` | `/api/v1/swap/submit` | JWT | Submit signed tx |
| `GET`  | `/api/v1/payout/banks` | JWT | Supported banks |
| `POST` | `/api/v1/payout/verify-account` | JWT | Verify bank account |
| `PUT`  | `/api/v1/payout/bank-details` | JWT | Save bank details |
| `GET`  | `/api/v1/price/all` | — | All asset prices |
| `GET`  | `/api/v1/price/:asset` | — | Single asset price |
| `POST` | `/api/v1/airtime/topup` | JWT | Buy airtime |
| `POST` | `/api/v1/kyc/submit` | JWT | Submit KYC |
| `POST` | `/api/v1/webhook/afriex` | — | Afriex webhook |
| `POST` | `/api/v1/webhook/opay` | — | Opay webhook |
| `POST` | `/api/v1/webhook/flipeet` | — | Flipeet webhook |
| `POST` | `/api/v1/webhook/flutterwave` | — | Flutterwave webhook |
| `POST` | `/api/v1/webhook/paystack` | — | Paystack webhook |

---

## Environment Variables

See `backend/.env.example` for the full list. Minimum to start:

```bash
DATABASE_URL="postgresql://hashpay:hashpay123@localhost:5432/hashpay_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET=any_32_char_string
```

For Sui integration add:
```bash
SUI_PACKAGE_ID=0x...
SUI_BACKEND_PRIVATE_KEY=suiprivkey1...
SUI_BACKEND_CAP_ID=0x...
SUI_TREASURY_CAP_ID=0x...
SUI_RATE_STORE_ID=0x...
SUI_BACKEND_SECP256K1_PRIVKEY=<hex>
```

---

## Supported Currencies

| Currency | Country | Providers |
|----------|---------|-----------|
| NGN | Nigeria | Opay (primary), Afriex (fallback) |
| GHS | Ghana | Afriex (primary), Flipeet (fallback) |
| KES | Kenya | Afriex |
| XOF | Senegal, Côte d'Ivoire | Flipeet |
| XAF | Cameroon, Chad | Flipeet |

---

## Security

- **Sui contracts**: secp256k1 signed quotes prevent MEV. `TreasuryCap`/`BackendCap` separation. `timeout_epoch` for user self-rescue.
- **EVM contracts**: `ReentrancyGuard` + `Pausable` + `Ownable`. Deploy owner as Gnosis Safe multisig.
- **Backend**: JWT auth, rate limiting, Helmet headers, HMAC webhook verification, AES-256-GCM for sensitive data, idempotency via Postgres unique constraints.
- **Frontend**: `AuthGuard` on all protected routes. JWT stored in `localStorage`. Mock mode for development.

---

## License

MIT © 2024 HashPay Global
