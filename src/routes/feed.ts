import { Router, Request, Response } from "express";
import * as posts from "../services/posts.js";

export const feedRouter = Router();

feedRouter.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

function toFeedItem(post: posts.Post) {
  return {
    id: post.id,
    author: post.author,
    title: post.title,
    content: post.content,
    sourceUrl: post.sourceUrl,
    createdAt: post.createdAt,
  };
}

feedRouter.get("/feed", (req: Request, res: Response) => {
  const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
  const author = typeof req.query.author === "string" ? req.query.author : undefined;
  const since = typeof req.query.since === "string" ? req.query.since : undefined;
  const listResult = posts.list({ limit, author, since });
  res.json({ posts: listResult.map(toFeedItem) });
});

feedRouter.get("/feed/rss", (req: Request, res: Response) => {
  const limit = req.query.limit != null ? Number(req.query.limit) : 50;
  const author = typeof req.query.author === "string" ? req.query.author : undefined;
  const since = typeof req.query.since === "string" ? req.query.since : undefined;
  const items = posts.list({ limit, author, since });
  const baseUrl = `${req.protocol}://${req.get("host") ?? "localhost"}`;
  const channelTitle = "SpeedRSS";
  const channelLink = `${baseUrl}/feed`;
  const channelDescription = "SpeedRSS: x402 RSS transmitter. X posts (author, title, content). AI-friendly feed.";
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channelDescription)}</description>
    <atom:link href="${escapeXml(baseUrl + req.originalUrl)}" rel="self" type="application/rss+xml"/>
    ${items.map((p) => `<item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(p.sourceUrl)}</link>
      <description>${escapeXml(p.content)}</description>
      <pubDate>${new Date(p.createdAt).toUTCString()}</pubDate>
      <guid isPermaLink="true">${escapeXml(p.sourceUrl)}</guid>
    </item>`).join("\n    ")}
  </channel>
</rss>`;
  res.type("application/rss+xml").send(rss);
});

feedRouter.get("/posts/:id", (req: Request, res: Response) => {
  const post = posts.getById(req.params.id);
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(toFeedItem(post));
});

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
