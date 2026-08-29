export interface ParsedApiError {
  message: string;
  code?: string;
  errors?: any;
  /** HTTP status, so callers can branch without re-reading the response. */
  status?: number;
}

/**
 * Turns a failed `fetch` Response into something worth showing a user.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THE NON-JSON PATH MATTERS
 * ─────────────────────────────────────────────────────────────────────────────
 * Not every failure comes from our own code. A request larger than the host's
 * body limit, or one that outlives the function timeout, is rejected by the
 * platform *before the route runs* — so the body is an HTML error page, not the
 * JSON `handleApiError` would have produced.
 *
 * This function used to answer every such case with "An error occurred while
 * parsing the error response." That sentence describes our own parser rather
 * than the user's problem, and it was the single most-reported error on the
 * upload screens: what people were actually hitting was an oversized upload.
 *
 * Now the status decides the message, because the status is the one thing
 * present even when the body is unreadable.
 */
export async function parseErrorFromResponse(
  response: Response,
): Promise<ParsedApiError> {
  try {
    const data = await response.json();

    return {
      message: data?.error?.message || fallbackForStatus(response.status),
      code: data?.error?.code,
      errors: data?.error?.meta?.errors,
      status: response.status,
    };
  } catch {
    return {
      message: fallbackForStatus(response.status),
      status: response.status,
    };
  }
}

/**
 * What to say when the body told us nothing.
 *
 * 413 and 504 are called out by name: both are reached almost exclusively by
 * uploading too much at once, and both are things the person can act on, which
 * a generic "something went wrong" is not.
 */
function fallbackForStatus(status: number): string {
  switch (status) {
    case 413:
      return "Those files are too large to upload together. Remove one and try again.";
    case 408:
    case 504:
      return "The upload timed out. Check your connection and try again with fewer images.";
    case 401:
      return "Your session has expired. Sign in again and retry.";
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "We couldn't find what you were looking for.";
    case 429:
      return "Too many attempts. Wait a moment and try again.";
    default:
      return status >= 500
        ? "Something went wrong on our end. Please try again."
        : "That request couldn't be completed. Please try again.";
  }
}
