/**
 * Currency utility using currency.js
 *
 * This file provides a configured instance of currency.js for handling
 * Nigerian Naira (₦) monetary values with proper formatting and precision.
 *
 * Values are stored in kobo (smallest unit) and converted for display.
 */

import currency from "currency.js";

/**
 * Converts kobo (smallest unit) to Naira for display
 * 1 Naira = 100 kobo
 */
export const koboToNaira = (kobo: number): number => {
  return kobo / 100;
};

/**
 * Converts Naira to kobo (smallest unit) for storage
 */
export const nairaToKobo = (naira: number): number => {
  return Math.round(naira * 100);
};

/**
 * Creates a currency.js instance configured for Naira
 * @param koboValue - The monetary value in kobo
 */
export const naira = (koboValue: number) =>
  currency(koboToNaira(koboValue), {
    symbol: "₦",
    precision: 2,
    separator: ",",
    decimal: ".",
    pattern: "! #",
    negativePattern: "-! #",
  });

/**
 * Formats a kobo value as Nigerian Naira
 * @param koboValue - The monetary value in kobo
 * @param options - Optional formatting options
 */
export const formatNaira = (
  koboValue: number,
  options?: {
    /** Whether to include the currency symbol */
    symbol?: boolean;
    /** Whether to include decimal places */
    showDecimals?: boolean;
  }
) => {
  const { symbol = true, showDecimals = false } = options || {};

  const config: currency.Options = {
    symbol: symbol ? "₦" : "",
    precision: showDecimals ? 2 : 0,
    separator: ",",
    decimal: ".",
    pattern: "! #",
    negativePattern: "-! #",
  };

  return currency(koboToNaira(koboValue), config).format();
};

/**
 * Adds the Naira sign to a value
 * This is useful for displaying values that are already in Naira
 * @param value - The monetary value which is already in naira (formatted and returned as number from the DB)
 * @param options - Optional formatting options
 */
export const addNairaSign = (
  value: number,
  options?: {
    /** Whether to include the currency symbol */
    symbol?: boolean;
    /** Whether to include decimal places */
    showDecimals?: boolean;
  }
) => {
  const { symbol = true, showDecimals = false } = options || {};

  const config: currency.Options = {
    symbol: symbol ? "₦" : "",
    precision: showDecimals ? 2 : 0,
    separator: ",",
    decimal: ".",
    pattern: "! #",
    negativePattern: "-! #",
  };

  return currency(value, config).format();
};

/**
 * Performs currency operations with proper precision
 * All values are in kobo
 */
export const currencyOperations = {
  /**
   * Add two or more monetary values (in kobo)
   */
  add: (a: number, b: number, ...rest: number[]): number => {
    let result = a + b;
    rest.forEach((value) => {
      result += value;
    });
    return result;
  },

  /**
   * Subtract one or more monetary values (in kobo)
   */
  subtract: (a: number, b: number, ...rest: number[]): number => {
    let result = a - b;
    rest.forEach((value) => {
      result -= value;
    });
    return result;
  },

  /**
   * Multiply a monetary value (in kobo) by a factor
   */
  multiply: (koboValue: number, factor: number): number => {
    return Math.round(koboValue * factor);
  },

  /**
   * Divide a monetary value (in kobo) by a divisor
   */
  divide: (koboValue: number, divisor: number): number => {
    return Math.round(koboValue / divisor);
  },

  /**
   * Calculate percentage of a monetary value (in kobo)
   */
  percentage: (koboValue: number, percent: number): number => {
    return Math.round(koboValue * (percent / 100));
  },
};
