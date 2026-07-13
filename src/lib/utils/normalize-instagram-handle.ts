/**
 * Converts any Instagram input format into a plain username.
 *
 * Accepted inputs:
 *   mybusiness
 *   @mybusiness
 *   instagram.com/mybusiness
 *   www.instagram.com/mybusiness/
 *   https://instagram.com/mybusiness
 *   https://www.instagram.com/mybusiness
 *   https://instagram.com/mybusiness/?hl=en
 *
 * All of the above return: mybusiness
 */
export function normalizeInstagramHandle(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  let working = trimmed;

  // Strip protocol (http:// or https://)
  working = working.replace(/^https?:\/\//i, "");

  // Strip www. prefix
  working = working.replace(/^www\./i, "");

  // If it's an Instagram profile URL, extract the first path segment
  if (/^instagram\.com\//i.test(working)) {
    const afterDomain = working.replace(/^instagram\.com\//i, "");
    // Split on / or ? — first segment is always the username
    return afterDomain.split(/[/?]/)[0];
  }

  // Plain handle — strip any leading @ characters
  return working.replace(/^@+/, "");
}
