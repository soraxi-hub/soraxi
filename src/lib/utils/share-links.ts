/**
 * Builds outbound share links for a URL + message.
 *
 * Plain `https://` URL schemes rather than a share SDK — WhatsApp, X and
 * Facebook all expose a share intent that needs nothing but a correctly
 * encoded query string, so a dependency would buy nothing here that three
 * template strings don't already provide.
 */

export interface ShareLinksInput {
  /** The absolute URL being shared (a store or product page). */
  url: string;
  /** Pre-filled message. Kept short — WhatsApp and X both render this as the post text. */
  text: string;
}

export interface ShareLinks {
  whatsapp: string;
  x: string;
  facebook: string;
}

export function buildShareLinks({ url, text }: ShareLinksInput): ShareLinks {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  return {
    // WhatsApp has no separate url/text fields — both go in one `text` param.
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };
}
