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
