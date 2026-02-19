import Database from "better-sqlite3";
import { CREATE_POSTS_TABLE } from "./schema.js";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";

const defaultPath = "./data/posts.db";
const dbPath = process.env.DB_PATH || defaultPath;

function ensureDir(path: string): void {
  const dir = path.includes("/") || path.includes("\\") ? join(path, "..") : ".";
  if (dir !== "." && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

if (dbPath !== ":memory:") {
  ensureDir(dbPath);
}

export const db = new Database(dbPath);
db.exec(CREATE_POSTS_TABLE);
