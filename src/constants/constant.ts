import { Playpen_Sans } from "next/font/google";

export const playpenSans = Playpen_Sans({
  weight: ["600"],
  subsets: ["latin"],
});

export const publicPaths = [
  "/",
  "/sign-in",
  "/sign-up",
  "/about",
  "/privacy-policy",
  "/shipping-return-policy",
  "/terms-conditions",
  "/support",
  "/cart",
  "/admin-sign-in",
  "/products/:path*",
  "/category/:path*",
  "/docs/:path*",
  "/docs/",
  "/checkout/payment-status",
  "/forgot-password",
  "/reset-password",
  "/store/onboarding",
  "/requests",
  "/requests/:path*",
  "/brand/:path*",
  "/store/waitlist",
  "/store/waitlist/status",
];

{
  /* IMPORTANT: This slugs must be changed else, it will not match what is stored in the DB which will cause filtering and sorting to break */
}
export const categories = [
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
export const getCategoryName = (slug: string): string | undefined => {
  const foundCat = categories.find((cat) => cat.slug === slug);
  return foundCat?.name;
};

export const getSubCategoryName = (
  catSlug: string,
  subCatSlug: string,
): string | undefined => {
  const foundSubCat = categories
    .find((cat) => cat.slug === catSlug)
    ?.subcategories.find((sub) => sub.slug === subCatSlug);
  return foundSubCat?.name;
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

// Nigerian tertiary institutions
export const INSTITUTIONS = [
  // Federal Universities
  "University of Lagos (UNILAG)",
  "University of Ibadan (UI)",
  "University of Nigeria, Nsukka (UNN)",
  "Ahmadu Bello University (ABU)",
  "Obafemi Awolowo University (OAU)",
  "University of Benin (UNIBEN)",
  "University of Ilorin (UNILORIN)",
  "University of Port Harcourt (UNIPORT)",
  "University of Calabar (UNICAL)",
  "University of Jos (UNIJOS)",
  "University of Maiduguri (UNIMAID)",
  "Bayero University Kano (BUK)",
  "Nnamdi Azikiwe University (UNIZIK)",
  "Federal University of Technology, Akure (FUTA)",
  "Federal University of Technology, Minna (FUTMINNA)",
  "Federal University of Technology, Owerri (FUTO)",
  "Michael Okpara University of Agriculture, Umudike (MOUAU)",
  "Federal University of Agriculture, Abeokuta (FUNAAB)",
  "Federal University, Lokoja",
  "Federal University, Oye-Ekiti (FUOYE)",
  "Federal University, Lafia",
  "Federal University, Dutse",
  "Federal University, Kashere",
  "Federal University, Dutsin-Ma",
  "Federal University, Wukari",
  "Federal University, Gusau",
  "Federal University, Birnin Kebbi",
  "Federal University, Gashua",
  "Federal University, Ndifu-Alike (FUNAI)",
  "Federal University of Health Sciences, Otukpo",
  "Federal University of Health Sciences, Azare",
  "Federal University of Transportation, Daura",
  "National Open University of Nigeria (NOUN)",

  // State Universities
  "Lagos State University (LASU)",
  "Rivers State University (RSU)",
  "Delta State University (DELSU)",
  "Ekiti State University (EKSU)",
  "Olabisi Onabanjo University (OOU)",
  "Ambrose Alli University (AAU)",
  "Adekunle Ajasin University (AAUA)",
  "Kogi State University",
  "Benue State University (BSU)",
  "Niger Delta University (NDU)",
  "Abia State University (ABSU)",
  "Enugu State University of Science and Technology (ESUT)",
  "Ebonyi State University (EBSU)",
  "Imo State University (IMSU)",
  "Kaduna State University (KASU)",
  "Kwara State University (KWASU)",
  "Osun State University (UNIOSUN)",
  "Tai Solarin University of Education (TASUED)",
  "Ondo State University of Science and Technology",
  "Akwa Ibom State University (AKSU)",
  "University of Cross River State (UNICROSS)",
  "Gombe State University",
  "Taraba State University",
  "Yobe State University",
  "Plateau State University",
  "Sule Lamido University",
  "Borno State University",
  "Edo State University Uzairue",
  "Confluence University of Science and Technology",
  "Moshood Abiola University of Science and Technology (MAUSTECH)",

  // Private Universities
  "Covenant University",
  "Babcock University",
  "Pan-Atlantic University (PAU)",
  "Redeemer's University",
  "Landmark University",
  "American University of Nigeria (AUN)",
  "Afe Babalola University (ABUAD)",
  "Bowen University",
  "Igbinedion University",
  "Benson Idahosa University",
  "Nile University",
  "Lead City University",
  "Bingham University",
  "Joseph Ayo Babalola University (JABU)",
  "Ajayi Crowther University",
  "Al-Hikmah University",
  "Madonna University",
  "Veritas University",
  "Caleb University",
  "Mountain Top University",
  "Elizade University",
  "Crawford University",
  "Chrisland University",
  "Hallmark University",
  "Summit University",
  "Wellspring University",
  "Augustine University",
  "Dominican University",
  "Anchor University",
  "Miva Open University",
  "Coal City University",
  "Greenfield University",
  "Skyline University Nigeria",
  "Thomas Adewumi University",
  "Atiba University",
  "Topfaith University",
  "Westland University",

  // Polytechnics
  "Yaba College of Technology (YABATECH)",
  "Federal Polytechnic Nekede",
  "Federal Polytechnic Ilaro",
  "Federal Polytechnic Ado-Ekiti",
  "Federal Polytechnic Oko",
  "Federal Polytechnic Offa",
  "Federal Polytechnic Bauchi",
  "Federal Polytechnic Bida",
  "Federal Polytechnic Nasarawa",
  "Kaduna Polytechnic",
  "Rufus Giwa Polytechnic",
  "Auchi Polytechnic",
  "Moshood Abiola Polytechnic (MAPOLY)",
  "The Polytechnic Ibadan",
  "Lagos State Polytechnic (LASPOTECH)",

  // Colleges of Education
  "Federal College of Education, Akoka",
  "Federal College of Education, Zaria",
  "Federal College of Education, Kano",
  "Federal College of Education, Abeokuta",
  "Federal College of Education, Obudu",
  "Adeniran Ogunsanya College of Education",
  "Emmanuel Alayande University of Education",
  "College of Education, Ikere-Ekiti",

  // Specialized Institutions
  // "Nigerian Defence Academy (NDA)",
  // "Air Force Institute of Technology (AFIT)",
  // "Nigerian Maritime University",
  // "Nigerian Army University Biu",
  // "Federal College of Fisheries and Marine Technology",
  // "National Institute of Construction Technology",

  "Other",
];
