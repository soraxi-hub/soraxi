import { describe, expect, it } from "vitest";

import { parseErrorFromResponse } from "@/lib/utils/parse-error-from-response";

/**
 * This helper is the origin of the "parse error" reported on every upload
 * screen. Its catch branch answered *any* unreadable body with "An error
 * occurred while parsing the error response" — a sentence describing our own
 * parser rather than the user's problem.
 *
 * An oversized upload is rejected by the host before the route runs, so the
 * body is an HTML error page and that branch is exactly what fired. The status
 * is the one thing still present, so it now decides the message.
 */

/** A Response whose body is not JSON, as a platform error page would be. */
function htmlResponse(status: number): Response {
  return new Response("<html><body>Request Entity Too Large</body></html>", {
    status,
    headers: { "content-type": "text/html" },
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("parseErrorFromResponse", () => {
  it("uses our own message when the body is the expected JSON", () => {
    const response = jsonResponse(400, {
      error: { message: "Your cart is empty.", code: "BAD_REQUEST" },
    });

    return parseErrorFromResponse(response).then((parsed) => {
      expect(parsed.message).toBe("Your cart is empty.");
      expect(parsed.code).toBe("BAD_REQUEST");
      expect(parsed.status).toBe(400);
    });
  });

  it("explains an oversized upload on a 413 with an unreadable body", async () => {
    const parsed = await parseErrorFromResponse(htmlResponse(413));

    expect(parsed.message).toContain("too large");
    expect(parsed.status).toBe(413);
    // The old sentence must never come back.
    expect(parsed.message).not.toContain("parsing the error response");
  });

  it("explains a timeout on a 504", async () => {
    const parsed = await parseErrorFromResponse(htmlResponse(504));

    expect(parsed.message).toContain("timed out");
    expect(parsed.message).toContain("fewer images");
  });

  it("tells a signed-out user to sign in on a 401", async () => {
    const parsed = await parseErrorFromResponse(htmlResponse(401));

    expect(parsed.message).toContain("session has expired");
  });

  it("falls back by status class when the body is empty", async () => {
    const server = await parseErrorFromResponse(new Response(null, { status: 500 }));
    const client = await parseErrorFromResponse(new Response(null, { status: 418 }));

    expect(server.message).toContain("our end");
    expect(client.message).toContain("couldn't be completed");
  });

  it("falls back by status when JSON parses but carries no error field", async () => {
    const parsed = await parseErrorFromResponse(jsonResponse(413, { ok: false }));

    expect(parsed.message).toContain("too large");
  });

  it("always reports the status so callers can branch on it", async () => {
    for (const status of [400, 401, 403, 404, 413, 429, 500, 504]) {
      const parsed = await parseErrorFromResponse(htmlResponse(status));
      expect(parsed.status).toBe(status);
      expect(parsed.message.length).toBeGreaterThan(0);
    }
  });
});
