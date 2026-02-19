# SpeedRSS Telegram notifier

When a new post is pushed to SpeedRSS, this service sends the cleaned post (author, content, link) to every **channel** or **group** the bot has been added to. No env list of chats—add or remove the bot to control where posts go.

## Setup

1. **Create a bot** with [@BotFather](https://t.me/BotFather). Send `/newbot`, follow the prompts, and copy the token.

2. **Configure** (copy `tg/.env.example` to `tg/.env` or set env):
   - `TELEGRAM_BOT_TOKEN` – token from BotFather
   - `PORT` – optional (default `4022`)

3. **Run the tg service** from the `tg` folder:
   ```bash
   cd tg && npm install && npm start
   ```

4. **Wire the main API**: set `TG_NOTIFY_URL=http://localhost:4022/notify` in the main API `.env`. Restart the main API.

5. **Add the bot to a channel or group** (as admin so it can post). Then **send /start in that chat** so the bot registers it (if the service was started after the bot was added, the "bot added" event may have been missed). New posts will be sent to every registered chat. Remove the bot from a chat to stop receiving posts.

6. **Main API must call the tg service**: In the **main** project `.env` (not tg), set `TG_NOTIFY_URL=http://localhost:4022/notify` (or your tg service URL). Restart the main API after changing. Without this, new submits won’t trigger Telegram notifications.

Chat IDs are stored in `tg/data/chats.json` (or `CHATS_FILE` if set). If nothing shows in Telegram: (1) confirm `TG_NOTIFY_URL` is set in the main API .env and the API was restarted, (2) send **/start** in the group/channel, (3) check the tg service console for "Notify: new post, chats to send:" and "Chat registered via /start".
