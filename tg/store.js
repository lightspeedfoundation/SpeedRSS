import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultPath = join(__dirname, "data", "chats.json");

function getPath() {
  return process.env.CHATS_FILE || defaultPath;
}

function ensureDir() {
  const path = getPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function loadChatIds() {
  try {
    const raw = readFileSync(getPath(), "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : (data.chatIds || []);
  } catch {
    return [];
  }
}

export function saveChatIds(chatIds) {
  ensureDir();
  const deduped = [...new Set(chatIds)].filter((id) => id != null && String(id).trim() !== "");
  writeFileSync(getPath(), JSON.stringify(deduped, null, 0), "utf8");
  return deduped;
}

export function addChat(chatId) {
  const list = loadChatIds();
  const id = String(chatId).trim();
  if (id && !list.includes(id)) {
    list.push(id);
    saveChatIds(list);
    return true;
  }
  return false;
}

export function removeChat(chatId) {
  const list = loadChatIds().filter((id) => String(id) !== String(chatId));
  saveChatIds(list);
}
