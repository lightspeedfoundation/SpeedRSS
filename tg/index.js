import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: join(dirname(fileURLToPath(import.meta.url)), ".env") });

import express from "express";
import { cleanPostContent } from "./clean.js";
import { loadChatIds, addChat, removeChat } from "./store.js";

const app = express();
app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PORT = Number(process.env.PORT) || 4022;

function formatMessage(post) {
  const body = cleanPostContent(post.content);
  const lines = [post.author || "Unknown", body, post.sourceUrl || ""].filter(Boolean);
  return lines.join("\n\n");
}

async function sendToTelegram(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram API ${res.status}: ${err}`);
  }
}

async function deleteWebhook() {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!data.ok) console.warn("deleteWebhook:", data);
}

async function getUpdates(offset) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?timeout=30&offset=${offset || 0}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`getUpdates ${res.status}`);
  const data = await res.json();
  return data.result || [];
}

async function reply(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

function processUpdate(update) {
  const m = update.my_chat_member;
  if (m && m.chat?.id != null) {
    const chatId = m.chat.id;
    const newStatus = m.new_chat_member?.status;
    const oldStatus = m.old_chat_member?.status;
    const isMember = newStatus === "member" || newStatus === "administrator";
    const wasLeft = oldStatus === "left" || oldStatus === "kicked" || !oldStatus;
    const isLeft = newStatus === "left" || newStatus === "kicked";
    if (isMember && wasLeft) {
      if (addChat(chatId)) {
        console.log("Bot added to chat:", chatId, m.chat.title || m.chat.username || "");
      }
    } else if (isLeft) {
      removeChat(chatId);
      console.log("Bot removed from chat:", chatId);
    }
    return;
  }
  const msg = update.message;
  if (msg?.chat?.id == null) return;
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  const textLower = text.toLowerCase();
  const type = msg.chat.type;
  console.log("Update: message chat_id=" + chatId + " type=" + type + " text=" + JSON.stringify(text.slice(0, 50)));
  if (!textLower.startsWith("/start") && textLower !== "/subscribe") return;
  if (type === "private") {
    reply(chatId, "Add this bot to a group or channel as admin, then send /start there to receive new posts.").catch(() => {});
    return;
  }
  if (type !== "group" && type !== "supergroup" && type !== "channel") {
    console.log("Ignored /start: chat type " + type + " not group/supergroup/channel");
    return;
  }
  if (addChat(chatId)) {
    console.log("Chat registered via /start:", chatId, msg.chat.title || msg.chat.username || "");
    reply(chatId, "This group/channel will receive new posts from the feed. Remove the bot to stop.").catch(() => {});
  } else {
    reply(chatId, "This group/channel is already receiving new posts.").catch(() => {});
  }
}

async function pollUpdates() {
  if (!TELEGRAM_BOT_TOKEN) return;
  await deleteWebhook();
  console.log("Polling for updates (add bot to a group/channel and send /start there)...");
  let offset = 0;
  for (;;) {
    try {
      const updates = await getUpdates(offset);
      if (updates.length > 0) console.log("Poll: got", updates.length, "updates");
      for (const u of updates) {
        offset = Math.max(offset, u.update_id + 1);
        processUpdate(u);
      }
    } catch (e) {
      console.error("Poll error:", e.message);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

app.post("/notify", async (req, res) => {
  const post = req.body;
  if (!post || !post.sourceUrl) {
    res.status(400).json({ error: "Missing post payload or sourceUrl" });
    return;
  }
  if (!TELEGRAM_BOT_TOKEN) {
    res.status(503).json({ error: "Bot not configured: set TELEGRAM_BOT_TOKEN" });
    return;
  }
  const chatIds = loadChatIds();
  console.log("Notify: new post, chats to send:", chatIds.length, chatIds);
  if (chatIds.length === 0) {
    res.status(200).json({ ok: true, sent: 0, message: "No channels or groups added yet. Add the bot to a channel or group, then send /start there to register." });
    return;
  }
  const text = formatMessage(post);
  const errors = [];
  for (const chatId of chatIds) {
    try {
      await sendToTelegram(chatId, text);
    } catch (e) {
      errors.push({ chatId, error: e.message });
    }
  }
  if (errors.length === chatIds.length) {
    res.status(502).json({ error: "Failed to send to any chat", details: errors });
    return;
  }
  if (errors.length > 0) {
    res.status(207).json({ ok: true, partial: true, sent: chatIds.length - errors.length, errors });
    return;
  }
  res.json({ ok: true, sent: chatIds.length });
});

app.get("/health", (_req, res) => {
  const chatIds = loadChatIds();
  res.json({
    status: "ok",
    configured: Boolean(TELEGRAM_BOT_TOKEN),
    chatCount: chatIds.length,
  });
});

app.listen(PORT, () => {
  console.log(`Telegram notify service listening on http://localhost:${PORT}`);
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("Set TELEGRAM_BOT_TOKEN to enable the bot.");
  } else {
    const n = loadChatIds().length;
    console.log("Add this bot to a channel or group to start receiving new posts. Active chats:", n);
    pollUpdates();
  }
});
