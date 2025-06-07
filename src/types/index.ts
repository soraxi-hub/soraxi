export interface Category {
  slug: string;
  name: string;
  subcategories: {
    slug: string;
    name: string;
  }[];
}
