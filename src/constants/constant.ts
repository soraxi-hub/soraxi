import { Playpen_Sans } from "next/font/google";

export const playpenSans = Playpen_Sans({
  weight: ["600"],
  subsets: ["latin"],
});

export const categories = [
  // {
  //   name: "Food & Drinks",
  //   slug: "food-drinks",
  //   subcategories: [
  //     { name: "Cooked Meals", slug: "cooked-meals" },
  //     { name: "Snacks", slug: "snacks" },
  //     { name: "Drinks & Beverages", slug: "drinks-beverages" },
  //     { name: "Fast Order Combos", slug: "fast-order-combos" },
  //   ],
  // },
  {
    name: "Fashion & Accessories",
    slug: "fashion-accessories",
    subcategories: [
      { name: "Clothing", slug: "clothing" },
      { name: "Footwear", slug: "footwear" },
      { name: "Bags", slug: "bags" },
      { name: "Jewelry & Watches", slug: "jewelry-watches" },
      { name: "Headwear", slug: "headwear" },
    ],
  },
  {
    name: "Electronics & Gadgets",
    slug: "electronics-gadgets",
    subcategories: [
      { name: "Phones", slug: "phones" },
      { name: "Phone Accessories", slug: "phone-accessories" },
      { name: "Power & Energy", slug: "power-energy" },
      { name: "Mini Gadgets", slug: "mini-gadgets" },
    ],
  },
  {
    name: "Books & Stationery",
    slug: "books-stationery",
    subcategories: [
      { name: "Textbooks", slug: "textbooks" },
      { name: "Past Questions", slug: "past-questions" },
      {
        name: "Notebooks & Writing Materials",
        slug: "notebooks-writing-materials",
      },
      { name: "Study Aids", slug: "study-aids" },
    ],
  },
  {
    name: "Beauty & Personal Care",
    slug: "beauty-personal-care",
    subcategories: [
      { name: "Skincare", slug: "skincare" },
      { name: "Hair Products", slug: "hair-products" },
      { name: "Makeup", slug: "makeup" },
      { name: "Perfumes & Deodorants", slug: "perfumes-deodorants" },
      { name: "Grooming", slug: "grooming" },
    ],
  },
  {
    name: "Groceries & Essentials",
    slug: "groceries-essentials",
    subcategories: [
      { name: "Dry Foodstuff", slug: "dry-foodstuff" },
      { name: "Household Items", slug: "household-items" },
      { name: "Cooking Essentials", slug: "cooking-essentials" },
      { name: "Quick Hostel Supplies", slug: "quick-hostel-supplies" },
    ],
  },
];

/**
 * Returns the display name of a category based on its slug.
 *
 * @param {CategorySlug} slug - The slug identifier of the category (e.g. `"food-drinks"`).
 * @returns {string | undefined} The category name (e.g. `"Food & Drinks"`) if found, otherwise `undefined`.
 *
 * @example
 * getCategoryName("electronics-gadgets");
 * // => "Electronics & Gadgets"
 */
export const getCategoryName = (slug: string) => {
  const foundCat = categories.find((cat) => cat.slug === slug);
  return foundCat?.name;
};

// Helper function to get subcategories for a category
export const getSubcategoriesForCategory = (categorySlug: string) => {
  const category = categories.find((cat) => cat.slug === categorySlug);
  return category?.subcategories || [];
};

// Get all category names
export const getCategoryNames = () => categories.map((cat) => cat.name);

// Get all subcategory names for a category
export const getSubcategoryNames = (categoryName: string) => {
  const category = categories.find((cat) => cat.name === categoryName);
  return category?.subcategories.map((sub) => sub.name) || [];
};

type Sluggable = string | string[];

export function slugify<T extends Sluggable>(text: T): T {
  const process = (t: string) =>
    t
      .toLowerCase()
      .replace(/'/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  if (Array.isArray(text)) {
    return text.map(process) as T;
  }
  return process(text) as T;
}
