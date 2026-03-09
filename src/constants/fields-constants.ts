{
  /* IMPORTANT: This slugs must be changed else, it will not match what is stored in the DB which will cause filtering and sorting to break */
}
export const targetAudience = [
  {
    name: "General",
    slug: "general",
    description: "Products suitable for all students",
  },
  {
    name: "Law",
    slug: "law",
    description: "Items tailored for law students",
    subfields: [
      { name: "Legal Outfits", slug: "legal-outfits" },
      { name: "Law Books & Materials", slug: "law-books-materials" },
      { name: "Law Accessories", slug: "law-accessories" },
    ],
  },
  {
    name: "Medicine & Health Sciences",
    slug: "medicine-health-sciences",
    description: "Products for medical and health science students",
    subfields: [
      { name: "Lab Coats & Scrubs", slug: "lab-coats-scrubs" },
      { name: "Medical Tools", slug: "medical-tools" },
      { name: "Medical Books", slug: "medical-books" },
    ],
  },
  {
    name: "Engineering",
    slug: "engineering",
    description: "Tools and materials for engineering students",
    subfields: [
      { name: "Engineering Calculators", slug: "engineering-calculators" },
      { name: "Drawing & Drafting Tools", slug: "drawing-drafting-tools" },
      { name: "Safety Gear", slug: "safety-gear" },
    ],
  },
  {
    name: "Accounting & Finance",
    slug: "accounting-finance",
    description: "Essentials for accounting and finance students",
    subfields: [
      { name: "Financial Calculators", slug: "financial-calculators" },
      { name: "Accounting Textbooks", slug: "accounting-textbooks" },
      { name: "Accounting Study Guides", slug: "accounting-study-guides" },
    ],
  },
  {
    name: "Computer Science & IT",
    slug: "computer-science-it",
    description: "Tech tools and resources for CS & IT students",
    subfields: [
      { name: "Laptops & Accessories", slug: "laptops-accessories" },
      { name: "Programming Books", slug: "programming-books" },
      { name: "Development Tools", slug: "development-tools" },
    ],
  },
];

// Get field name from slug
export const getFieldName = (slug: string) => {
  const field = targetAudience.find((f) => f.slug === slug);
  return field?.name;
};

// Get all fields
export const getFieldNames = () => targetAudience.map((f) => f.name);

// Get subfields for a field
export const getSubfieldsForField = (fieldSlug: string) => {
  const field = targetAudience.find((f) => f.slug === fieldSlug);
  return field?.subfields || [];
};
