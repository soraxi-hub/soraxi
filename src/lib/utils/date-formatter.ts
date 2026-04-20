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
   * Returns date & time in: `25 Dec 2025, 14:32`
   */
  public static dateTime(input: Date | string | number): string {
    const date = this.parse(input);

    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Returns time only in: `14:32`
   */
  public static timeOnly(input: Date | string | number): string {
    const date = this.parse(input);

    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
