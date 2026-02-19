import { Router, Request, Response } from "express";
import { extractFromUrl, isValidXStatusUrl } from "../services/x-extract.js";
import * as posts from "../services/posts.js";

export const submitRouter = Router();

function toResponse(post: posts.Post) {
  return {
    id: post.id,
    author: post.author,
    title: post.title,
    content: post.content,
    sourceUrl: post.sourceUrl,
    createdAt: post.createdAt,
  };
}

submitRouter.post("/submit", async (req: Request, res: Response) => {
  const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  if (!url) {
    res.status(400).json({ error: "Missing or invalid body: { \"url\": \"<X status URL>\" }" });
    return;
  }
  if (!isValidXStatusUrl(url)) {
    res.status(400).json({ error: "Invalid X/Twitter status URL. Use e.g. https://x.com/username/status/123..." });
    return;
  }
  try {
    const extracted = await extractFromUrl(url);
    const existing = posts.findBySourceUrl(url);
    if (existing) {
      res.status(200).json(toResponse(existing));
      return;
    }
    const post = posts.createPost({
      sourceUrl: url,
      author: extracted.author,
      authorUrl: extracted.authorUrl,
      authorDisplayName: extracted.authorDisplayName,
      title: extracted.title,
      content: extracted.content,
    });
    const notifyUrl = process.env.TG_NOTIFY_URL;
    if (notifyUrl) {
      fetch(notifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toResponse(post)),
      }).catch((err) => console.error("TG notify failed:", err));
    }
    res.status(201).json(toResponse(post));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    if (message.includes("Invalid") || message.includes("not found") || message.includes("unavailable")) {
      res.status(422).json({ error: message });
      return;
    }
    res.status(502).json({ error: message });
  }
});
