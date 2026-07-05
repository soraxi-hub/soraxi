const TELEGRAM_CHAR_LIMIT = 4096;
const REQUEST_TIMEOUT_MS = 8000;

export async function sendTelegramMessage(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    const err = new Error("Telegram env vars are missing");
    console.error(err.message);
    throw err;
  }

  // Telegram rejects messages over 4096 chars, which is exactly the length
  // a stack trace tends to hit. Truncate so the report still gets through.
  const text =
    message.length > TELEGRAM_CHAR_LIMIT
      ? message.slice(0, TELEGRAM_CHAR_LIMIT - 20) + "\n...[truncated]"
      : message;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          // No parse_mode on purpose: raw error text often contains
          // unbalanced _ * ` [ chars that make Markdown parsing fail,
          // silently dropping the message you most need to see.
        }),
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      const body = await res.text();
      const err = new Error(`Telegram error (${res.status}): ${body}`);
      console.error(err.message);
      throw err;
    }
  } catch (err) {
    // Catches network failures and the timeout abort too.
    if (err instanceof Error && err.name === "AbortError") {
      const timeoutErr = new Error(
        `Telegram request timed out after ${REQUEST_TIMEOUT_MS}ms`,
      );
      console.error(timeoutErr.message);
      throw timeoutErr;
    }
    // Re-throw the http error above (already logged) or a raw fetch failure.
    if (err instanceof Error) console.error(err.message);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
