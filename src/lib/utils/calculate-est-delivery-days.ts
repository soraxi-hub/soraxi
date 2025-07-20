/**
 * Adds a specified number of business days to a given date.
 * Sundays are not counted as business days.
 *
 * @param date - The starting Date.
 * @param daysToAdd - The number of business days to add.
 * @returns A new Date that is the result of adding the business days.
 */
function addBusinessDays(date: Date, daysToAdd: number): Date {
  const result = new Date(date);
  while (daysToAdd > 0) {
    // Move to the next day
    result.setDate(result.getDate() + 1);
    // Only count the day if it is not a Sunday (0 represents Sunday)
    if (result.getDay() !== 0) {
      daysToAdd--;
    }
  }
  return result;
}

/**
 * Calculates an estimated delivery date range for a product.
 * The function takes the shipping days required (excluding processing days)
 * and calculates the lower bound by adding that many business days (skipping Sundays)
 * to the order date. It then calculates an upper bound by adding 2 additional business days.
 *
 * @param shippingDays - The number of shipping days (business days) required.
 * @returns A string representing the estimated delivery date range in the format "DD MMMM YYYY - DD MMMM YYYY".
 *
 * @example
 * // If today is March 18, 2025 and shippingDays is 5:
 * // lower bound: March 23, 2025, upper bound: March 25, 2025,
 * // so the function returns "23 March 2025 - 25 March 2025".
 */
export function calculateEstimatedDeliveryDays(shippingDays: number): string {
  // Get the current date (order date)
  const orderDate = new Date(Date.now());

  // Calculate the lower bound by adding shippingDays business days (skipping Sundays)
  const lowerBound = addBusinessDays(orderDate, shippingDays);

  // Calculate the upper bound by adding 2 additional business days to the lower bound
  const upperBound = addBusinessDays(lowerBound, 2);

  // Format the dates to "DD MMMM YYYY" (e.g., "23 March 2025")
  const formatDate = (date: Date): string =>
    date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  // Return the estimated delivery range as a string
  return `${formatDate(lowerBound)} - ${formatDate(upperBound)}`;
}
