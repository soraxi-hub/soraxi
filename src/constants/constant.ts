import { Playpen_Sans } from "next/font/google";

export const playpenSans = Playpen_Sans({
  weight: ["600"],
  subsets: ["latin"],
});

export const categories = [
  {
    name: "Food & Drinks",
    slug: "food-drinks",
    subcategories: [
      { name: "Cooked Meals", slug: "cooked-meals" },
      { name: "Snacks", slug: "snacks" },
      { name: "Drinks & Beverages", slug: "drinks-beverages" },
      { name: "Fast Order Combos", slug: "fast-order-combos" },
    ],
  },
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

// Slugify a string
export function slugify(text: string): string {
  return text
    .toLowerCase() // Convert to lowercase
    .replace(/'/g, "") // Remove apostrophes
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^a-z0-9\-]/g, "") // Remove any other non-url-friendly characters
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Trim hyphens from start/end
}
