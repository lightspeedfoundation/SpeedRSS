# SpeedRSS

**SpeedRSS** is an x402 RSS transmitter: the only input is links from X. Pay **$0.25** (via [x402](https://x402.org)) to submit an X (Twitter) post URL; the API derives **author**, **post title**, and **post content** and adds the post to a public feed. Built to extend the reach of CT on X to outside X. API-only, AI-first: **AI agents** can discover, pay, submit, and consume the feed (e.g. autonomous RSS-style consumption). No first-party UI; a Chrome extension for human submission from X is a possible later addition.

## Quick start

1. Copy env and set your wallet and facilitator:

   ```bash
   cp .env.example .env
   # Edit .env: PAY_TO (EVM address), FACILITATOR_URL (e.g. https://x402.org/facilitator for testnet)
   ```

2. Install and run:

   ```bash
   npm install
   npm run dev
   ```

   Server runs at `http://localhost:4021` (or `PORT` from env).

## Environment variables

| Variable          | Required | Description |
|-------------------|----------|-------------|
| `SKIP_PAYMENT`    | No       | Set to `true` to disable x402 for `POST /submit` (free mode for local testing). When `true`, `PAY_TO` and `FACILITATOR_URL` are not required. |
| `PAY_TO`          | When payment enabled | EVM wallet address that receives the $0.25 payment (e.g. Base Sepolia for testnet). |
| `FACILITATOR_URL` | When payment enabled | x402 facilitator URL (testnet: `https://x402.org/facilitator`; for production use a mainnet facilitator). |
| `PORT`            | No       | Server port (default `4021`). |
| `DB_PATH`         | No       | SQLite database path (default `./data/posts.db`). |

## API (AI-agent-friendly)

### Paid: submit an X post URL

- **Endpoint**: `POST /submit`
- **Payment**: x402 required; **$0.25** per request. If payment is missing or invalid, the server responds with **402 Payment Required** and payment instructions. Send the request again with the appropriate payment header to complete.
- **Body**: `{ "url": "https://x.com/username/status/123..." }` (also accepts `twitter.com` URLs).
- **Success**: `201` with `{ "id", "author", "title", "content", "sourceUrl", "createdAt" }`. If the same URL was already submitted, returns `200` with the existing post.
- **Errors**: `400` (missing/invalid body or URL), `422` (tweet not found or unavailable), `502` (extraction failure).

Example (after paying via x402):

```bash
curl -X POST http://localhost:4021/submit \
  -H "Content-Type: application/json" \
  -d '{"url":"https://x.com/someuser/status/123456789"}'
```

### Free: read the feed

- **GET /feed** – JSON list of posts (newest first). Query: `?limit=`, `?author=`, `?since=` (ISO date).
- **GET /feed/rss** – Same content as RSS 2.0 for feed readers and agents.
- **GET /posts/:id** – Single post by id.
- **GET /health** – Health check (`{ "status": "ok" }`).

Example:

```bash
curl http://localhost:4021/feed
curl "http://localhost:4021/feed?limit=10&author=@handle"
curl http://localhost:4021/feed/rss
```

## For AI agents

1. **Discover**: Use an x402 facilitator that supports discovery (e.g. Bazaar) to find the `POST /submit` endpoint and its price ($0.25).
2. **Pay**: On first request you receive **402** with payment instructions; complete payment (e.g. with an x402 client and EVM signer) and retry with the payment proof.
3. **Submit**: Send `POST /submit` with JSON body `{ "url": "<X or Twitter status URL>" }`.
4. **Consume**: Call **GET /feed** or **GET /feed/rss** to read the promoted posts (author, title, content, sourceUrl, createdAt).

No API keys or login required for the feed; payment is per submit via x402.

## Telegram (channels and groups)

The **tg** service sends each new post to every Telegram channel or group the bot has been added to (cleaned content, no media URLs). No chat ID list in env—add the bot to a channel or group as admin and it will start receiving posts; remove the bot to stop. See [tg/README.md](tg/README.md). Run the tg service, set `TG_NOTIFY_URL` in the main API `.env` (e.g. `http://localhost:4022/notify`), and set `TELEGRAM_BOT_TOKEN` in `tg/.env`.

## Widget (embed on your site)

A small embeddable feed widget is served at **/widget**. Anyone can add the feed to their site with an iframe.

### Embed

Set the widget size with the iframe `width` and `height` attributes. Use the same origin as your API (e.g. your deployed API URL):

```html
<iframe
  src="https://your-api-domain.com/widget"
  title="SpeedRSS Feed"
  width="400"
  height="500"
></iframe>
```

For local testing: `http://localhost:4021/widget`

### Widget features

- **Size** – Defined by the iframe tag (`width` and `height`). The widget fills the iframe.
- **Search** – Search box at the top filters posts by author, title, or content (client-side).
- **Sort** – Posts are shown **newest first** by default.
- **Images** – Image links (e.g. pic.twitter.com) in post content are rendered as images instead of URLs.
- **Style** – Minimalist: light gray background, simple borders, neutral typography.

### Optional query params

- **api** – If the widget is hosted elsewhere, point it at your feed API:  
  `https://your-site.com/widget?api=https://your-api-domain.com`
