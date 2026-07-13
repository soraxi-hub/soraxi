import type { ChangeEvent } from "react";

type InputChangeHandler = (e: ChangeEvent<HTMLInputElement>) => void;

/**
 * Returns an onChange handler for a text input used as a decimal price field.
 * Accepts digits and a single decimal point; silently rejects everything else.
 *
 * @param setDisplay - Local display-string state setter (keeps intermediate "100." intact)
 * @param onChange   - Parsed number callback (receives 0 when the field is empty)
 */
export function makeDecimalChangeHandler(
  setDisplay: (val: string) => void,
  onChange: (val: number) => void,
): InputChangeHandler {
  return (e) => {
    const raw = e.target.value;
    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
      setDisplay(raw);
      onChange(raw === "" ? 0 : parseFloat(raw) || 0);
    }
  };
}

/**
 * Returns an onChange handler for a text input used as an integer field.
 * Accepts digits only; silently rejects everything else.
 *
 * @param setDisplay - Local display-string state setter
 * @param onChange   - Parsed integer callback (receives 0 when the field is empty)
 */
export function makeIntegerChangeHandler(
  setDisplay: (val: string) => void,
  onChange: (val: number) => void,
): InputChangeHandler {
  return (e) => {
    const raw = e.target.value;
    if (raw === "" || /^\d*$/.test(raw)) {
      setDisplay(raw);
      onChange(raw === "" ? 0 : parseInt(raw, 10) || 0);
    }
  };
}
