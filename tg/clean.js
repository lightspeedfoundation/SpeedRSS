const mediaUrlRe = /(https?:\/\/)?(pic\.twitter\.com\/[a-zA-Z0-9]+|t\.co\/[a-zA-Z0-9]+)/gi;
const attributionRe = /\s*(?:&mdash;|—|-)\s*[^\n]+\(@[^)]+\)[^\n]*$/i;

export function cleanPostContent(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(mediaUrlRe, "")
    .replace(attributionRe, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
