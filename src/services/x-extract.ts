const X_STATUS_URL_REGEX = /^https?:\/\/(www\.)?(x\.com|twitter\.com)\/[^/]+\/status\/(\d+)(\?.*)?$/i;

export function isValidXStatusUrl(url: string): boolean {
  return X_STATUS_URL_REGEX.test(url.trim());
}

export interface ExtractedPost {
  author: string;
  authorUrl?: string;
  authorDisplayName?: string;
  title: string;
  content: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveHandleFromAuthorUrl(authorUrl: string): string {
  try {
    const path = new URL(authorUrl).pathname;
    const segment = path.split("/").filter(Boolean)[0];
    return segment ? `@${segment}` : "unknown";
  } catch {
    return "unknown";
  }
}

export async function extractFromUrl(url: string): Promise<ExtractedPost> {
  const trimmed = url.trim();
  if (!isValidXStatusUrl(trimmed)) {
    throw new Error("Invalid X/Twitter status URL");
  }
  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(trimmed)}`;
  const res = await fetch(oembedUrl, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    if (res.status === 404 || res.status === 403) {
      throw new Error("Tweet not found or unavailable (private/deleted)");
    }
    throw new Error(`Failed to fetch tweet: ${res.status}`);
  }
  const data = (await res.json()) as {
    author_name?: string;
    author_url?: string;
    html?: string;
    url?: string;
  };
  const authorUrl = data.author_url;
  const authorDisplayName = data.author_name ?? undefined;
  const author = authorUrl ? deriveHandleFromAuthorUrl(authorUrl) : (data.author_name ?? "unknown");
  const rawHtml = data.html ?? "";
  const text = stripHtml(rawHtml);
  const title = text.length > 100 ? `${text.slice(0, 97)}…` : text || author;
  const content = text || "(no text)";
  return {
    author,
    authorUrl,
    authorDisplayName,
    title,
    content,
  };
}
