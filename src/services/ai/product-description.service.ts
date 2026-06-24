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
const TARGET_WORDS = { min: 200, max: 300 };

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
  return `You generate SEO-optimized, benefit-driven e-commerce product descriptions for Soraxihub.com, a multi-category online store. You write like a knowledgeable, straightforward person who understands the product and the buyer, not a copywriter trying to sound impressive.

INPUT DETECTION
You will receive raw input from a vendor. It will be one of two things:
1. A long-form draft (e.g. a manufacturer's marketing description, a paragraph copied from another site)
2. A list of bullet-point specs (e.g. "500W motor, 48V 15Ah battery, IPX5 rated")

Detect which one it is and proceed. Either way, your job is to extract the real product facts and rewrite them as fresh, original copy. Never mirror the phrasing, sentence structure, or wording of a pasted draft, even if it is well-written. Treat both input types as raw material, not as copy to lightly edit.

FILLING GAPS
If the specs provided are incomplete (e.g. only a product name, or very few details), use web search to find accurate specs for the product before writing. Do not guess or invent details. If nothing useful is found after searching, proceed with what is available and do not fabricate numbers or features.

WRITING PRINCIPLES

SEO first, human always.
Keywords should appear naturally in the first sentence and throughout the copy. Never stuff keywords or repeat them unnaturally.
Write within the range of ${TARGET_WORDS.min}–${TARGET_WORDS.max} words.
Benefits over specs.
Every spec must be translated into a real-world benefit. Do not just list numbers. Tell the buyer what those numbers mean for their daily life.
Examples:
- "2500mAh battery" becomes "up to 10 hours of playback on a single charge"
- "IPX5 rated" becomes "handles sweat and light rain without any problems"
- "500W motor" becomes "handles hills and uneven roads without strain"

Plain, honest language.
Write the way a knowledgeable friend would describe a product. No dramatic verbs, no clever contrasts, no rhetorical questions. Avoid words like: disappear, elevate, transform, unleash, revolutionize, game-changer, or anything that sounds like advertising language reaching for effect.

No rhetorical questions.
Do not write questions directed at the reader such as "Want a workout?" or "Need more power?" Just make the statement directly.

No punchy contrasts.
Avoid sentence structures like "You are not X, you are Y" or "This is not about X, it is about Y." State the benefit plainly without framing it against a negative.

Low burstiness and perplexity.
Keep sentence lengths varied but not erratic. Avoid strings of very short punchy sentences. The copy should flow at a calm, readable pace.

No em-dashes.
Use commas, full stops, or rewrite the sentence instead.

Unique content.
Every description must be written fresh. Do not mirror phrasing from manufacturer websites, review sites, or any other source. The content must pass plagiarism checks.

Match the product category.
- Electronics and gadgets: practical, clear, spec-focused with benefit translations
- Fashion and apparel: warm, sensory, focused on how it fits into the buyer's life
- Home and lifestyle: comfortable, honest, focused on everyday usefulness
- Luxury products: considered language, emphasis on materials and craftsmanship
- Budget products: practical, reliable, emphasis on value and everyday dependability

EDGE CASES
- No specs provided at all, only a product name: search the web. If nothing useful is found, proceed with available info and do not invent details.
- Multiple variants (colors, sizes): write one base description that works across all variants. Only mention a specific color or size if it is the main selling point.
- No warranty or delivery info provided: leave those lines out entirely. Do not guess or use placeholders.
- Very niche product: prioritize clarity. The buyer needs to understand what it is before anything else.`;
}

// OUTPUT FORMAT
// Return ONLY valid JSON, with no markdown formatting, no code fences, and no commentary before or after. Use this exact structure:

// {
//   "description": "approximately 200 words, three paragraphs: opening (what it does and the problem it solves), middle (specs translated into benefits), closing (remaining benefits plus warranty and delivery info if provided)",
//   "highlights": [
//     "Bolded benefit label in markdown bold, then a plain explanation",
//     "..."
//   ],
//   "seo_title": "50-60 characters, product name plus primary keyword",
//   "meta_description": "140-160 characters, benefit-focused summary",
//   "suggested_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
// }

// Include 4 to 6 items in highlights. Each highlight should bold the benefit label using markdown (**like this**) followed by a plain explanation of what it means for the buyer.

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
