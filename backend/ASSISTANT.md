# HashPay DeepSeek assistant

The dashboard robot connects to authenticated `POST /api/v1/assistant`. DeepSeek runs on the backend with a server-owned system prompt, validated tool arguments and user-scoped database reads. The implementation follows [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/) and [Tool Calls](https://api-docs.deepseek.com/guides/tool_calls/). Responses stream as SSE, including real tool activity and task buttons. No database migration or new dependency is required.

## Configuration

Set these **backend-only** environment variables locally in ignored `backend/.env`, or in the Railway backend service:

```dotenv
DEEPSEEK_API_KEY=your_rotated_key
DEEPSEEK_MODEL=deepseek-flash
```

Retain the existing DATABASE_URL, REDIS_URL, JWT_SECRET and other backend configuration. Do not add the provider key to any `VITE_` variable or commit it. Rotate any key disclosed in a conversation.

The dashboard defaults to `${VITE_API_URL}/assistant`. An optional `VITE_ASSISTANT_ENDPOINT` overrides the URL. The frontend attaches the current HashPay session JWT, not the DeepSeek key. Configure `FRONTEND_URL` on the backend to match the website for CORS. The standalone demo stays in local demo mode.

## Supported tasks

| Request | Behavior |
| --- | --- |
| General conversation | Normal streamed assistant replies |
| Account balance, KYC and linked wallets | Reads only the signed-in user's selected fields |
| Recent transactions or conversion orders | Reads up to 20 records belonging to the signed-in user |
| Current prices | Calls the app's price oracle and includes a check timestamp |
| Open dashboard, swap, portfolio or offramp | Offers an app navigation button |
| Open send, receive, scan, convert or bills | Offers a button to open the existing form |
| Prepare a transfer to a HashPay account | Validates the recipient and amount, then offers a review button that prefills the Send form |

Task buttons require a click. Opening or preparing a form never submits a transaction. The user checks the resolved recipient, amount and available balance, then explicitly clicks the existing Send button to send money. The assistant has no payment execution, arbitrary URL, arbitrary user ID, SQL, filesystem, admin or secret-reading tool. It cannot automatically swap, withdraw, send funds, change bank details or perform KYC. Missing recipient/amount must be clarified. Unsupported tasks are explained rather than fabricated.

Account data returned by tools is sent to DeepSeek to answer the request. Password hashes, provider keys, bank credentials and private keys are excluded. Tool results and call history are trusted only for the current server request; client input cannot supply system prompts, tools or tool results. Requests accept at most 24 messages / 32,000 characters and have a 90-second deadline, 8-tool budget and per-user rate limit. Long UI conversations send a bounded recent history. Conversation history is kept in the mounted widget, not persisted by this app.

## Widget integration

`RobotAssistant.tsx` configures two instance-specific callbacks:

- `requestAssistant(url, init)`: adds the current session's authorization header.
- `performAction(action)`: validates allowlisted targets, navigates or opens a form, and returns a truthful status string after the user's click.

SSE events use `delta`, `activity`, `action` and `label`; failures use `error`, and success ends with `[DONE]`. For example:

```text
data: {"action":{"kind":"navigate","target":"portfolio"},"label":"Open portfolio"}

data: {"delta":"Your portfolio button is ready."}

data: [DONE]

```

The widget renders all strings as text. An embedding without the action callback cannot execute app tasks. HTTP errors, provider billing/key failures and stream interruptions display Retry. Retry does not execute payments because assistant tools only read data or prepare UI actions.

## Checks

From `backend`: `npm run build` and `npm test -- src/services/assistant src/routes/assistant.test.ts`.

From `frontend`: `npm run build`, `node robot-chat-check.mjs` and `node assistant-app-check.mjs`. Browser checks require Google Chrome on Windows. The app integration test uses a fake login and mocked API responses, verifies the Authorization header, task click, draft prefill, navigation allowlist and that no payment request is submitted automatically. Live provider smoke checks exercise a short chat and an open-screen tool call without accessing real account records or submitting transactions.
