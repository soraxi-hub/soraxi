export interface ParsedApiError {
  message: string;
  code?: string;
  cause?: string;
}

/**
 * Parses an error response from an API call using the AppError structure.
 * @param response - The fetch Response object
 * @returns A ParsedApiError with message, code, and cause
 */
export async function parseErrorFromResponse(
  response: Response
): Promise<ParsedApiError> {
  try {
    const data = await response.json();
    console.log("data", data);

    return {
      message: data?.error?.message || "An unknown error occurred.",
      code: data?.error?.code,
      cause: data?.error?.cause,
    };
  } catch {
    return {
      message: "An error occurred while parsing the error response.",
    };
  }
}
