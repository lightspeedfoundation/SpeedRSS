import { randomUUID } from "crypto";
import { db } from "../db/client.js";

export interface Post {
  id: string;
  sourceUrl: string;
  author: string;
  authorUrl?: string;
  authorDisplayName?: string;
  title: string;
  content: string;
  createdAt: string;
}

function rowToPost(row: Record<string, unknown>): Post {
  return {
    id: row.id as string,
    sourceUrl: row.source_url as string,
    author: row.author as string,
    authorUrl: row.author_url as string | undefined,
    authorDisplayName: row.author_display_name as string | undefined,
    title: row.title as string,
    content: row.content as string,
    createdAt: row.created_at as string,
  };
}

export function createPost(data: {
  sourceUrl: string;
  author: string;
  authorUrl?: string;
  authorDisplayName?: string;
  title: string;
  content: string;
}): Post {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO posts (id, source_url, author, author_url, author_display_name, title, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    data.sourceUrl,
    data.author,
    data.authorUrl ?? null,
    data.authorDisplayName ?? null,
    data.title,
    data.content,
    createdAt,
  );
  return {
    id,
    sourceUrl: data.sourceUrl,
    author: data.author,
    authorUrl: data.authorUrl,
    authorDisplayName: data.authorDisplayName,
    title: data.title,
    content: data.content,
    createdAt,
  };
}

export function findBySourceUrl(sourceUrl: string): Post | null {
  const row = db.prepare("SELECT * FROM posts WHERE source_url = ?").get(sourceUrl) as Record<string, unknown> | undefined;
  return row ? rowToPost(row) : null;
}

export function getById(id: string): Post | null {
  const row = db.prepare("SELECT * FROM posts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToPost(row) : null;
}

export interface ListOptions {
  limit?: number;
  author?: string;
  since?: string;
}

export function list(options: ListOptions = {}): Post[] {
  const { limit = 50, author, since } = options;
  let sql = "SELECT * FROM posts WHERE 1=1";
  const params: (string | number)[] = [];
  if (author) {
    sql += " AND author = ?";
    params.push(author);
  }
  if (since) {
    sql += " AND created_at >= ?";
    params.push(since);
  }
  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(Math.min(Math.max(1, limit), 100));
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(rowToPost);
}

export function updatePost(id: string, data: { author?: string; authorUrl?: string; authorDisplayName?: string; title?: string; content?: string }): Post | null {
  const existing = getById(id);
  if (!existing) return null;
  const author = data.author ?? existing.author;
  const authorUrl = data.authorUrl !== undefined ? data.authorUrl : existing.authorUrl;
  const authorDisplayName = data.authorDisplayName !== undefined ? data.authorDisplayName : existing.authorDisplayName;
  const title = data.title ?? existing.title;
  const content = data.content ?? existing.content;
  db.prepare(
    "UPDATE posts SET author = ?, author_url = ?, author_display_name = ?, title = ?, content = ? WHERE id = ?",
  ).run(author, authorUrl ?? null, authorDisplayName ?? null, title, content, id);
  return getById(id);
}
