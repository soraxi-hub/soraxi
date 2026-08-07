"use client";

import {
  Fragment,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

import { cn } from "@/lib/utils";
import { DELIVERY_CODE_LENGTH } from "@/constants/delivery";

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  /** Rendered smaller inside the vendor's dialog than on the rider page. */
  size?: "default" | "compact";
  autoFocus?: boolean;
}

/**
 * Six single-digit boxes, grouped 3 + 3.
 *
 * Built for someone standing outside a hostel at night, one-handed, on a cheap
 * Android. Every decision here follows from that:
 *
 * - `inputMode="numeric"` raises the numeric keypad rather than a full
 *   keyboard, which is both faster and far more accurate with a thumb.
 * - Boxes auto-advance and backspace steps back, so the code can be entered
 *   without ever aiming at a specific box.
 * - Pasting into any box fills all six — riders are sent codes over WhatsApp
 *   more often than anyone plans for.
 * - The error state lives on the boxes themselves, not only in a toast. A toast
 *   vanishes, and this person may glance away mid-entry.
 */
export function CodeInput({
  value,
  onChange,
  disabled = false,
  hasError = false,
  size = "default",
  autoFocus = false,
}: CodeInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = value
    .padEnd(DELIVERY_CODE_LENGTH, " ")
    .slice(0, DELIVERY_CODE_LENGTH)
    .split("");

  const setDigit = (index: number, digit: string) => {
    const next = digits.map((d) => (d === " " ? "" : d));
    next[index] = digit;
    onChange(next.join("").trim());
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;

    setDigit(index, digit);

    if (index < DELIVERY_CODE_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();

      if (digits[index]?.trim()) {
        setDigit(index, "");
        return;
      }

      // Empty box — step back and clear the previous one, which is what
      // someone correcting a typo expects.
      if (index > 0) {
        setDigit(index - 1, "");
        refs.current[index - 1]?.focus();
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < DELIVERY_CODE_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, DELIVERY_CODE_LENGTH);

    if (!pasted) return;

    onChange(pasted);
    refs.current[Math.min(pasted.length, DELIVERY_CODE_LENGTH - 1)]?.focus();
  };

  /**
   * Boxes are **fluid, not fixed**.
   *
   * Six fixed 48px boxes plus gaps and the group spacer come to 326px, which
   * overflows a 320px phone (264px of usable width inside the page and card
   * padding) and even a 360px one. `flex-1` with `min-w-0` lets them shrink to
   * whatever is available and `max-w` stops them sprawling on a desktop.
   *
   * Height stays fixed so the touch target never shrinks with the width.
   */
  const boxClass =
    size === "compact"
      ? "h-10 max-w-11 text-lg"
      : "h-12 max-w-13 text-xl sm:h-14 sm:max-w-14 sm:text-2xl";

  return (
    <div
      className="flex w-full items-center justify-center gap-1.5 sm:gap-2"
      role="group"
      aria-label={`${DELIVERY_CODE_LENGTH}-digit delivery code`}
    >
      {digits.map((digit, index) => (
        <Fragment key={index}>
          <input
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit.trim()}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            aria-label={`Digit ${index + 1}`}
            aria-invalid={hasError}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            onFocus={(event) => event.target.select()}
            className={cn(
              "w-full min-w-0 flex-1 rounded-lg border-2 bg-background",
              "text-center font-semibold tabular-nums",
              "transition-colors outline-none",
              "focus:border-soraxi-green focus:ring-2 focus:ring-soraxi-green/20",
              "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
              hasError ? "border-soraxi-error" : "border-border",
              boxClass,
            )}
          />
          {/* Visual grouping only — 482 917 reads aloud far better than 482917.
              `shrink-0` so the gap survives when the boxes compress. */}
          {index === DELIVERY_CODE_LENGTH / 2 - 1 && (
            <span className="w-1.5 shrink-0 sm:w-3" aria-hidden />
          )}
        </Fragment>
      ))}
    </div>
  );
}
