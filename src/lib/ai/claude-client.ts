import Anthropic from "@anthropic-ai/sdk";

/**
 * Singleton Anthropic client.
 *
 * The SDK reads ANTHROPIC_API_KEY from the environment automatically.
 * We set a conservative timeout: description generation should be fast,
 * and we'd rather surface a clear error than hang a vendor's form.
 */
let _client: Anthropic | null = null;

function getClaudeClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. " +
          "Add it to your .env.local file and to your Vercel environment variables.",
      );
    }

    _client = new Anthropic({
      apiKey,
      /**
       * 30-second wall-clock timeout.
       * Haiku is fast; if it hasn't responded in 30 s something is wrong.
       */
      timeout: 30_000,
      /**
       * The SDK retries on transient network errors and 529/529-class
       * overload responses by default (2 retries). Leave as-is.
       */
      maxRetries: 2,
    });
  }

  return _client;
}

export { getClaudeClient };
