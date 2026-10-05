# Account wallet connections

After signing in by email, choose **Connect wallet** in the dashboard sidebar.
Users can link several wallets, revisit **Manage wallets**, and remove individual
links. Removing a link does not revoke a browser extension's site permissions;
users can revoke those permissions in the extension itself.

Supported providers:

| Wallet | Address network | Ownership proof |
| --- | --- | --- |
| Freighter | Stellar | SEP-53 message signature |
| LOBSTR extension | Stellar | SEP-53 message signature approved in LOBSTR |
| MetaMask | Ethereum/EVM | `personal_sign` |
| Phantom | Solana | Ed25519 message signature |
| Installed Sui wallets | Sui | Sui personal-message signature |

The browser extensions must be installed and unlocked. MetaMask and Phantom
also work where their mobile in-app browsers expose the provider. QR-based
WalletConnect and standalone mobile deep links are not part of this flow.
Phantom is linked through its Solana address; its EVM accounts are not selected.

## Server behavior

`POST /auth/wallet-challenge` requires a HashPay login and takes `provider` and
`walletAddress`. It returns a five-minute challenge bound to the HashPay user,
website, provider and normalized address. Redis stores the challenge.

`POST /auth/connect-wallet` takes `challengeId` and `signature`. The server
verifies the signature and atomically consumes the challenge before storing the
link. Addresses cannot be linked to two users. `GET /auth/wallets` lists the
caller's links; `DELETE /auth/wallets/:id` removes only the caller's link.
`GET /auth/me` includes `linkedWallets`.

Old address fields remain available to existing settlement services, but old
addresses must be signed again to appear in the verified links list. Account
linking does not implement wallet login, payments, swap signing or escrow deposits.
The previous Sui login button called a login-protected linking route and could
not authenticate a logged-out user; the login page now explains the email flow.

## Database and deployment

`backend/prisma/wallet_connections_migration.sql` adds only the `linked_wallets`
table and its index. It does not alter existing balances, users or transactions.
The backend Docker startup applies this repeatable migration before starting the
server, so a Railway redeployment creates the required table automatically.
For another deployment method or local database, run:

```powershell
npm.cmd run db:wallet-links --workspace backend
```

Generate Prisma after updating dependencies:

```powershell
npx.cmd prisma generate --schema backend/prisma/schema.prisma
```

Configure `FRONTEND_URL` to the exact frontend origin and ensure Redis is healthy.
No RPC credentials are needed for these off-chain proofs. Stellar signatures
prove control of the corresponding signing key; multisig transaction authority
is not established by this message flow.

Before calling the integration verified on a live deployment, link and remove
each wallet using its actual extension, reject one signature request, reload the
dashboard to check persistence, and check the mobile wallet browsers in use.

## Wallet balances

The dashboard and Manage wallets show read-only balances for verified links.
`GET /auth/wallets/:id/balance?network=...` first checks that the caller owns the
link, then reads the selected network. Balances refresh every 30 seconds while
visible and have a 15-second server cache. A failed refresh retains the last
retrieved balance with a warning and timestamp. Provider failures are not zeros.
Token quantities remain decimal strings to preserve precision.

Mainnet is selected initially. Each wallet has an explicit network selector:

| Wallet chain | Networks | Balances shown |
| --- | --- | --- |
| EVM | Ethereum, Base, Arbitrum, Ethereum Sepolia | Native ETH, Circle USDC, and up to 100 indexed ERC-20 holdings |
| Stellar | Mainnet, testnet | XLM and issued assets; issuer IDs distinguish assets with the same code |
| Solana | Mainnet, devnet | SOL and SPL/Token-2022 account balances, aggregated by mint |
| Sui | Mainnet, testnet | SUI and coin balances via GraphQL, up to 50 coin types plus native SUI |

These are on-chain quantities, not a fiat portfolio total or spendable HashPay
naira balance. EVM token discovery uses Blockscout and can lag behind chain state. Staked
assets, DeFi positions and collectible valuations are not included. Unknown
Solana tokens use their mint IDs, and missing Sui decimals produce clearly
labelled raw units rather than guessed amounts. Network labels and testnet
notices distinguish test assets from actual funds.

Public endpoints work without new secrets. Configure the `WALLET_*` endpoints
in `backend/.env.example` for production provider quotas. The EVM service checks the
RPC chain ID before reading balances, preventing a misconfigured endpoint from
returning another network's holdings. No database migration is needed for reads.

## Stellar token pricing

XLM (Stellar's native lumen) appears in landing and dashboard live prices and
swap estimate selectors. The price API tracks XLM/USD using CoinGecko's
`stellar` ID and the Pyth `Crypto.XLM/USD` feed as fallback; XLM/NGN uses the
existing USD/NGN FX provider. The public Pyth XLM endpoint returned HTTP 401
during verification; fallback availability depends on provider access. CoinGecko
returned a live XLM/USD price successfully. Connected Stellar wallets already show XLM and
issued assets. Stellar transaction signing is supported for XLM/Circle USDC swaps as described below; cash-out is not enabled.

## Executable Stellar swaps

The swap page supports XLM ? Circle USDC on **Stellar mainnet** through a
verified Freighter or LOBSTR link. Other pairs remain price estimates.
`POST /stellar-swap/quote` discovers strict-send paths through Horizon rather
than treating USD price ratios as executable liquidity. The resulting XDR pays
the proceeds back to the same account, enforces a 0.5% minimum receive amount,
and expires after 90 seconds. The quote shows fees, the Circle issuer and any
new trustline reserve. No HashPay trading fee is added.

The service checks account ownership, network passphrase, available balances,
selling liabilities, USDC authorization/limit, account reserves and basic signer
thresholds. Missing receiving USDC trustlines are created in the same atomic
transaction and disclosed before approval. Additional-signature accounts are
unsupported. Both directions require sufficient XLM for reserves and fees.

`POST /stellar-swap/submit` accepts only the matching unsigned transaction body
with a valid signature from the linked account, rejects modified operations,
and broadcasts the signed XDR to Horizon. Private keys stay in the wallet.
The transaction hash makes retries idempotent. Unknown submission outcomes are
reconciled with `GET /stellar-swap/:quoteId/status`; they are not success messages
or invitations to submit another swap. An expired transaction is cleared only
when Horizon has ingested a ledger beyond its time bound and still reports no
transaction for that hash. Submitted quote records remain for 24 hours; quotes
not submitted remain for 10 minutes. Redis must be available to create or submit
quotes. The browser saves a pending hash/quote ID per user and resumes checks
after reload, including when a different token pair is initially displayed.

The fixed mainnet issuer is
`GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`.
`WALLET_STELLAR_HORIZON_URL` can point at a dedicated mainnet Horizon service;
a testnet or mismatched provider is refused. These are same-network swaps,
not a bridge to Ethereum, Base, Solana or Sui USDC. Actual execution depends
on liquidity at inclusion time; slippage protection may cause a failed ledger
transaction, which can still charge its network fee.

Verification includes signed XDR service tests and browser fixtures for
approval rejection, quote review, pending confirmation and reload recovery on
desktop/mobile. A live mainnet read found a route for 6 XLM to Circle USDC.
No mainnet funds were moved during verification. Actual Freighter/LOBSTR
extension approval and a deployed end-to-end swap still need to be verified.

## XLM in Convert to cash

The conversion modal lists XLM and requests a read-only naira estimate through
`POST /escrow/estimate`, with the same displayed 0.5% fee calculation used by
existing conversion quotes. This endpoint does not generate a Sui signature or
deposit payload for native XLM. The modal explicitly labels the result as an
estimate and keeps cash-out disabled until Stellar bank settlement is integrated.
