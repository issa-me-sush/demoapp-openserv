# OpenServ Agent Demo App

A minimal Next.js demo showing webhook → agent → callback flow with the REST API agent.

## Setup

### 1. Install Dependencies

```bash
cd demo-app
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Your OpenServ webhook trigger URL
OPENSERV_WEBHOOK_URL=https://api-staging.oserv.dev/webhooks/trigger/YOUR_WEBHOOK_ID

# Your app URL (for callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Polling configuration
# Maximum wait time for agent response (milliseconds, default: 60000 = 60s)
NEXT_PUBLIC_CALLBACK_TIMEOUT=60000

# How often to poll for callback (milliseconds, default: 1000 = 1s)
NEXT_PUBLIC_CALLBACK_POLL_INTERVAL=1000
```

### 3. Configure OpenServ Secrets

In your OpenServ workspace, add a secret:

- **Name**: `frontend_url`
- **Value**: `http://your_ngrok_url/api/callback`

(In production, use your deployed URL like `https://yourdomain.com/api/callback`)

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## How It Works

### Flow:

```
1. User enters prompt → Frontend
                         ↓
2. POST /api/trigger → OpenServ Webhook
   Payload: { id, prompt }  ← That's all you need!
                         ↓
3. OpenServ intelligently processes prompt
                         ↓
4. Agent generates output
                         ↓
5. REST API agent "callback" capability
   - Fetches frontend_url from secrets
   - POSTs { id, output } back
                         ↓
6. Frontend receives result
                         ↓
7. User sees the answer ✅
```

### Example Webhook Payload:

```json
{
  "id": "req_1234567890_abc123",
  "prompt": "What is web3?"
}
```

That's it! OpenServ's intelligent platform figures out what to do with the prompt.

### Example Callback Payload:

```json
{
  "id": "req_1234567890_abc123",
  "output": "Web3 is the next generation of the internet..."
}
```

## REST API Agent Integration

The final step in your OpenServ workflow should call the REST API agent's `callback` capability:

```json
{
  "id": "{{triggerEvent.id}}",
  "output": "{{agent.response}}",
  "frontend_url_name": "frontend_url"
}
```

This will:
1. Fetch the callback URL from the `frontend_url` secret
2. POST the result back to your frontend

## How Callbacks Work

### Current Implementation (Demo):
- **POST /api/callback**: Agent sends `{ id, output }`, stored in memory
- **GET /api/callback?id=xxx**: Frontend polls every second to check if callback arrived
- **Auto-cleanup**: Callbacks deleted after retrieval or 5 minutes

### Flow:
```
1. Frontend sends request with unique ID
2. Frontend starts polling GET /api/callback?id=xxx every 1s
3. Agent completes work
4. Agent POSTs to /api/callback → stored in memory
5. Frontend's next poll finds the data
6. Callback deleted, result displayed
```

### Production Enhancements:
1. **Redis/Database** - Store callbacks (survive server restarts)
2. **WebSockets** - Real-time push instead of polling
3. **Server-Sent Events (SSE)** - Stream updates to client
4. **Webhook signatures** - Verify callback authenticity
5. **Rate limiting** - Prevent polling abuse

## File Structure

```
demo-app/
├── app/
│   ├── page.tsx           # Main UI (prompt input + result display)
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Tailwind styles
├── pages/
│   └── api/
│       ├── trigger.ts     # Webhook trigger endpoint
│       └── callback.ts    # Callback receiver endpoint
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── .env.example
```

## Troubleshooting

### Callback not received
- Check OpenServ secrets has `frontend_url` with correct URL
- Verify webhook URL in `.env` is correct
- Check REST API agent logs for errors
- Ensure frontend is running on correct port

### Webhook fails
- Verify `OPENSERV_WEBHOOK_URL` in `.env`
- Check OpenServ dashboard for workflow errors
- Ensure webhook is enabled and active

### Timeout
- Default timeout is 60 seconds (configurable via `NEXT_PUBLIC_CALLBACK_TIMEOUT`)
- Check agent execution time in OpenServ dashboard
- Increase timeout in `.env` for long-running tasks:
  ```bash
  # Wait up to 5 minutes for slow agents
  NEXT_PUBLIC_CALLBACK_TIMEOUT=300000
  ```

### Slow responses
- Adjust polling interval in `.env`:
  ```bash
  # Poll every 2 seconds instead of 1 second
  NEXT_PUBLIC_CALLBACK_POLL_INTERVAL=2000
  ```
- Faster polling = more responsive but more server load
- Slower polling = less server load but slower to show results

## Learn More

- [OpenServ Documentation](https://docs.openserv.ai)
- [Next.js Documentation](https://nextjs.org/docs)
- [REST API Agent README](../rest-api-agent/README.md)

