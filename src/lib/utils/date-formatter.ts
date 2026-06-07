/**
 * DateFormatter
 * --------------
 * Utility class for formatting Mongoose date fields (`createdAt`, `updatedAt`)
 * into human-readable formats.
 *
 * Supports:
 * - Date objects
 * - ISO date strings
 * - Timestamps (number)
 */
export class DateFormatter {
  private static MS_PER_DAY = 1000 * 60 * 60 * 24; // Used for calculating date differences
  /**
   * Parses and validates a date input.
   *
   * @param input - A Date, ISO date string, or timestamp
   * @returns A valid Date object
   * @throws Error if the date is invalid
   */
  private static parse(input: Date | string | number): Date {
    const date = new Date(input);

    if (isNaN(date.getTime())) {
      throw new Error("Invalid date provided");
    }

    return date;
  }

  /**
   * Determines whether a date is considered a business day.
   *
   * @param date - Date to evaluate
   * @param excludedDays - Weekdays to exclude
   * @returns True if the date is a business day
   */
  private static isBusinessDay(date: Date, excludedDays: number[]): boolean {
    return !excludedDays.includes(date.getDay());
  }

  /**
   * Adds business days to a date.
   *
   * Business days are determined by excluding the supplied weekday numbers.
   *
   * Weekday reference:
   * - 0 = Sunday
   * - 1 = Monday
   * - 2 = Tuesday
   * - 3 = Wednesday
   * - 4 = Thursday
   * - 5 = Friday
   * - 6 = Saturday
   *
   * @param startDate - Starting date
   * @param businessDays - Number of business days to add
   * @param excludedDays - Days that should not count as business days
   * @returns New date with business days added
   */
  public static addBusinessDays(
    startDate: Date | string | number,
    businessDays: number,
    excludedDays: number[] = [0, 6],
  ): Date {
    const result = new Date(this.parse(startDate));

    let daysAdded = 0;

    while (daysAdded < businessDays) {
      result.setDate(result.getDate() + 1);

      if (this.isBusinessDay(result, excludedDays)) {
        daysAdded++;
      }
    }

    return result;
  }

  /**
   * Calculates the number of business days remaining until a deadline.
   *
   * @param deadline - Future deadline
   * @param excludedDays - Days that should not count as business days
   * @returns Number of business days remaining
   */
  public static businessDaysUntil(
    deadline: Date | string | number,
    excludedDays: number[] = [0, 6],
  ): number {
    const endDate = this.parse(deadline);
    const now = new Date();

    if (endDate <= now) {
      return 0;
    }

    let count = 0;
    const cursor = new Date(now);

    while (cursor < endDate) {
      cursor.setDate(cursor.getDate() + 1);

      if (this.isBusinessDay(cursor, excludedDays)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Calculates an estimated delivery date range.
   *
   * Shipping days are counted as business days while excluding
   * the supplied non-business weekdays.
   *
   * Example:
   * - shippingDays = 5
   * - lowerBound = today + 5 business days
   * - upperBound = lowerBound + 2 business days
   *
   * @param shippingDays - Shipping duration in business days
   * @param excludedDays - Days that should not count as business days
   * @returns Formatted delivery range
   */
  public static estimatedDeliveryRange(
    shippingDays: number,
    excludedDays: number[] = [0],
  ): string {
    const orderDate = new Date();

    const lowerBound = this.addBusinessDays(
      orderDate,
      shippingDays,
      excludedDays,
    );

    const upperBound = this.addBusinessDays(lowerBound, 2, excludedDays);

    return `${this.longDate(lowerBound)} - ${this.longDate(upperBound)}`;
  }

  /**
   * Returns date in: `25 Dec 2025`
   */
  public static shortDate(input: Date | string | number): string {
    const date = this.parse(input);

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  /**
   * Returns date in: `December 25, 2025`
   */
  public static longDate(input: Date | string | number): string {
    const date = this.parse(input);

    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  /**
   * Returns a formatted date and time string.
   *
   * @param input - A Date object, timestamp number, or date string.
   * @param includeAmPm - If `true`, returns time in 12‑hour format with AM/PM (e.g., "25 Dec 2025, 02:32 PM").
   *                      If `false` (default), returns time in 24‑hour format (e.g., "25 Dec 2025, 14:32").
   * @returns The formatted date and time string, with day, month (short), year, hour, and minute.
   */
  public static dateTime(
    input: Date | string | number,
    includeAmPm: boolean = true,
  ): string {
    const date = this.parse(input);
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    if (includeAmPm) {
      options.hour12 = true;
    }
    return date.toLocaleString("en-GB", options);
  }

  /**
   * Returns a formatted time string.
   *
   * @param input - A Date object, timestamp number, or date string.
   * @param includeAmPm - If `true`, returns time in 12‑hour format with AM/PM (e.g., "02:32 PM").
   *                      If `false` (default), returns time in 24‑hour format (e.g., "14:32").
   * @returns The formatted time string, consisting of hours and minutes only.
   */
  public static timeOnly(
    input: Date | string | number,
    includeAmPm: boolean = true,
  ): string {
    const date = this.parse(input);
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    if (includeAmPm) {
      options.hour12 = true;
    }
    return date.toLocaleTimeString("en-GB", options);
  }

  /**
   * Returns ISO-like format: `2025-12-25`
   */
  public static isoDate(input: Date | string | number): string {
    const date = this.parse(input);

    return date.toISOString().split("T")[0];
  }

  /**
   * Returns relative time:
   * - `Just now`
   * - `5 minutes ago`
   * - `2 days ago`
   */
  public static fromNow(input: Date | string | number): string {
    const date = this.parse(input);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";

    const intervals: Record<string, number> = {
      year: 31536000,
      month: 2592000,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    for (const unit in intervals) {
      const value = Math.floor(seconds / intervals[unit]);
      if (value >= 1) {
        return `${value} ${unit}${value > 1 ? "s" : ""} ago`;
      }
    }

    return "Just now";
  }

  /**
   * Returns the age of an account in a human-readable format.
   * - `2 days`
   * - `3 months`
   * - `1 year`
   */
  public static accountAge(input: Date | string | number): string {
    const date = this.parse(input);
    const now = new Date();
    const ageInDays = Math.floor(
      (now.getTime() - date.getTime()) / this.MS_PER_DAY,
    );

    let age = "";
    if (ageInDays < 30) {
      age = `${ageInDays} days`;
    } else if (ageInDays < 365) {
      const months = Math.floor(ageInDays / 30);
      age = `${months} month${months > 1 ? "s" : ""}`;
    } else {
      const years = Math.floor(ageInDays / 365);
      age = `${years} year${years > 1 ? "s" : ""}`;
    }

    return age;
  }

  /**
   * Returns remaining time until a future date.
   * - `2h 15m`
   * - `10m 5s`
   * - `30s`
   */
  public static timeRemaining(input: Date | string | number): string {
    const date = this.parse(input);
    const secondsLeft = Math.ceil((date.getTime() - Date.now()) / 1000);

    // If time has already passed
    if (secondsLeft <= 0) return "Expired";

    const hours = Math.floor(secondsLeft / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);
    const seconds = secondsLeft % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  }
}
