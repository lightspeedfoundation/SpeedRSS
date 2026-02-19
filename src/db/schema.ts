export const CREATE_POSTS_TABLE = `
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  source_url TEXT UNIQUE NOT NULL,
  author TEXT NOT NULL,
  author_url TEXT,
  author_display_name TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_source_url ON posts(source_url);
`;
