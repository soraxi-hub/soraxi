import { Playpen_Sans } from "next/font/google";

export const playpenSans = Playpen_Sans({
  weight: ["600"],
  subsets: ["latin"],
});

export const categories = [
  {
    name: "Electronics",
    slug: "electronics",
    subcategories: [
      { name: "Mobile Phones", slug: "mobile-phones" },
      { name: "Computers", slug: "computers" },
      { name: "Tablets", slug: "tablets" },
      { name: "Televisions", slug: "televisions" },
      { name: "Cameras", slug: "cameras" },
      { name: "Audio Devices", slug: "audio-devices" },
      { name: "Wearable Technology", slug: "wearable-technology" },
      { name: "Gaming Consoles", slug: "gaming-consoles" },
    ],
  },
  {
    name: "Clothing",
    slug: "clothing",
    subcategories: [
      { name: "Men's Clothing", slug: "mens-clothing" },
      { name: "Women's Clothing", slug: "womens-clothing" },
      { name: "Kid's Clothing", slug: "kids-clothing" },
      { name: "Activewear", slug: "activewear" },
      { name: "Outerwear", slug: "outerwear" },
      { name: "Sleepwear", slug: "sleepwear" },
      { name: "Formalwear", slug: "formalwear" },
    ],
  },
  {
    name: "Furniture",
    slug: "furniture",
    subcategories: [
      { name: "Living Room", slug: "living-room" },
      { name: "Bedroom", slug: "bedroom" },
      { name: "Office", slug: "office" },
      { name: "Outdoor", slug: "outdoor" },
      { name: "Storage", slug: "storage" },
      { name: "Decor", slug: "decor" },
      { name: "Lighting", slug: "lighting" },
    ],
  },
  {
    name: "Toys",
    slug: "toys",
    subcategories: [
      { name: "Action Figures", slug: "action-figures" },
      { name: "Puzzles", slug: "puzzles" },
      { name: "Educational Toys", slug: "educational-toys" },
      { name: "Dolls", slug: "dolls" },
      { name: "Building Sets", slug: "building-sets" },
      { name: "Outdoor Toys", slug: "outdoor-toys" },
      { name: "Video Games", slug: "video-games" },
    ],
  },
  {
    name: "Groceries",
    slug: "groceries",
    subcategories: [
      { name: "Fruits and Vegetables", slug: "fruits-and-vegetables" },
      { name: "Dairy Products", slug: "dairy-products" },
      { name: "Beverages", slug: "beverages" },
      { name: "Snacks", slug: "snacks" },
      { name: "Bakery", slug: "bakery" },
      { name: "Frozen Foods", slug: "frozen-foods" },
      { name: "Meat and Seafood", slug: "meat-and-seafood" },
    ],
  },
  {
    name: "Body Care Products",
    slug: "body-care-products",
    subcategories: [
      { name: "Skincare", slug: "skincare" },
      { name: "Hair Care", slug: "hair-care" },
      { name: "Oral Care", slug: "oral-care" },
      { name: "Bath and Shower", slug: "bath-and-shower" },
      {
        name: "Deodorants and Antiperspirants",
        slug: "deodorants-and-antiperspirants",
      },
      { name: "Fragrances", slug: "fragrances" },
      { name: "Shaving and Hair Removal", slug: "shaving-and-hair-removal" },
      { name: "Hand and Foot Care", slug: "hand-and-foot-care" },
    ],
  },
  {
    name: "Fashion",
    slug: "fashion",
    subcategories: [
      { name: "Clothing", slug: "clothing" },
      { name: "Footwear", slug: "footwear" },
      { name: "Accessories", slug: "accessories" },
      { name: "Undergarments", slug: "undergarments" },
      { name: "Seasonal Wear", slug: "seasonal-wear" },
      { name: "Fashion Jewelry", slug: "fashion-jewelry" },
    ],
  },
  {
    name: "Phone Accessories",
    slug: "phone-accessories",
    subcategories: [
      { name: "Protective Gear", slug: "protective-gear" },
      { name: "Charging Solutions", slug: "charging-solutions" },
      { name: "Audio Accessories", slug: "audio-accessories" },
      { name: "Mounts and Holders", slug: "mounts-and-holders" },
      { name: "Connectivity", slug: "connectivity" },
      { name: "Storage and Memory", slug: "storage-and-memory" },
      { name: "Photography Enhancements", slug: "photography-enhancements" },
      { name: "Wearables", slug: "wearables" },
    ],
  },
  {
    name: "School Supplies",
    slug: "school-supplies",
    subcategories: [
      { name: "Writing Instruments", slug: "writing-instruments" },
      { name: "Paper Products", slug: "paper-products" },
      { name: "Organizational Supplies", slug: "organizational-supplies" },
      { name: "Art and Craft Supplies", slug: "art-and-craft-supplies" },
      { name: "Technology and Gadgets", slug: "technology-and-gadgets" },
      { name: "Classroom Essentials", slug: "classroom-essentials" },
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
