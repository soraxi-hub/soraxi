import { getClaudeClient } from "@/lib/ai/claude-client";
import Anthropic from "@anthropic-ai/sdk";

/**
 * The minimum product context we need to write a good description.
 * All fields are optional at the type level; the service validates what it
 * needs so the frontend can call this at any stage of the wizard.
 */
export interface ProductDescriptionContext {
  name: string;
  category?: string[];
  subCategory?: string[];
  targetAudience?: string[];
  price?: number; // in Kobo — we convert to Naira for the prompt
  specifications?: string; // may contain HTML from ReactQuill
  productType?: string;
}

export interface GenerateDescriptionResult {
  success: true;
  description: string;
  /** Approximate token cost for observability / future rate-limit tracking */
  tokensUsed: number;
}

export interface GenerateDescriptionError {
  success: false;
  error: string;
  /** "retryable" = transient; "permanent" = bad input or config */
  kind: "retryable" | "permanent";
}

export type GenerateDescriptionResponse =
  | GenerateDescriptionResult
  | GenerateDescriptionError;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODEL = "claude-haiku-4-5-20251001";
/** Target word count — kept in one place so the prompt and UI copy match. */
const TARGET_WORDS = { min: 200, max: 250 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags produced by ReactQuill to avoid leaking markup into the prompt */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Convert Kobo integer to Naira display string */
function koboToNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

/**
 * Build the system prompt.
 *
 * Keeping this as a pure function (no side effects, easy to unit-test)
 * means we can swap or A/B-test prompts without touching service logic.
 */
function buildSystemPrompt(): string {
  return `You are an expert e-commerce copywriter specialising in Nigerian university marketplace products.

Your task is to write compelling, SEO-friendly product descriptions.

Rules you MUST follow:
- Write exactly ${TARGET_WORDS.min}–${TARGET_WORDS.max} words. Count carefully.
- Write in clear, friendly British-English (commonly used in Nigerian academia).
- Lead with the most important benefit in the first sentence.
- Use natural keyword placement; do NOT keyword-stuff.
- Avoid filler phrases like "This product is…", "Introducing…", or "Look no further".
- Never invent specifications not given to you. If uncertain, stay general.
- Output ONLY the description text — no title, no bullet points, no preamble.
- Do not include HTML tags in your output.`;
}

/**
 * Build the user prompt from available product context.
 *
 * We deliberately make this human-readable rather than dumping raw JSON,
 * which tends to produce better copy from Claude.
 */
function buildUserPrompt(ctx: ProductDescriptionContext): string {
  const parts: string[] = [`Product name: ${ctx.name}`];

  if (ctx.category?.length) {
    parts.push(`Category: ${ctx.category.join(", ")}`);
  }
  if (ctx.subCategory?.length) {
    parts.push(`Sub-category: ${ctx.subCategory.join(", ")}`);
  }
  if (ctx.targetAudience?.length) {
    parts.push(`Target audience: ${ctx.targetAudience.join(", ")}`);
  }
  if (ctx.price && ctx.price > 0) {
    parts.push(`Price: ${koboToNaira(ctx.price)}`);
  }
  if (ctx.specifications) {
    const stripped = stripHtml(ctx.specifications);
    if (stripped) {
      parts.push(`Specifications:\n${stripped}`);
    }
  }

  return (
    parts.join("\n") + "\n\nWrite a product description for the above product."
  );
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ProductDescriptionService {
  /**
   * Generate a product description.
   *
   * Returns a discriminated union so the route handler can pattern-match
   * without try/catch — keeps the route thin.
   */
  static async generate(
    ctx: ProductDescriptionContext,
  ): Promise<GenerateDescriptionResponse> {
    // ---- Input validation ----
    if (!ctx.name?.trim()) {
      return {
        success: false,
        error: "Product name is required to generate a description.",
        kind: "permanent",
      };
    }

    const client = getClaudeClient();

    let message: Anthropic.Message;

    try {
      message = await client.messages.create({
        model: MODEL,
        max_tokens: 600, // ~250 words is ~350 tokens; headroom for variance
        system: buildSystemPrompt(),
        messages: [{ role: "user", content: buildUserPrompt(ctx) }],
      });
    } catch (err) {
      /**
       * The SDK throws typed errors.
       * - APIConnectionError / APIConnectionTimeoutError → retryable
       * - RateLimitError (429) → retryable (SDK already retried twice)
       * - AuthenticationError (401) → permanent (misconfiguration)
       * - Everything else → permanent for the client; log for us
       */
      if (err instanceof Anthropic.APIConnectionError) {
        return {
          success: false,
          error: "Could not reach the AI service. Please try again.",
          kind: "retryable",
        };
      }
      if (err instanceof Anthropic.RateLimitError) {
        return {
          success: false,
          error: "AI service is busy. Please wait a moment and try again.",
          kind: "retryable",
        };
      }
      if (err instanceof Anthropic.AuthenticationError) {
        // This is a server misconfiguration — log loudly, surface generic message
        console.error(
          "[ProductDescriptionService] Anthropic authentication failed. " +
            "Check ANTHROPIC_API_KEY.",
          err,
        );
        return {
          success: false,
          error: "AI service is temporarily unavailable.",
          kind: "permanent",
        };
      }

      // Catch-all
      console.error("[ProductDescriptionService] Unexpected API error:", err);
      return {
        success: false,
        error: "Failed to generate description. Please try again.",
        kind: "retryable",
      };
    }

    // ---- Extract text from response ----
    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text" || !textBlock.text.trim()) {
      console.error(
        "[ProductDescriptionService] Empty or unexpected response:",
        message,
      );
      return {
        success: false,
        error: "AI returned an empty description. Please try again.",
        kind: "retryable",
      };
    }

    return {
      success: true,
      description: textBlock.text.trim(),
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    };
  }
}
