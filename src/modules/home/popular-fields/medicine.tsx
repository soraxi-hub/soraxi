import ReusableProductSection from "@/components/reusable-product-section";
import { targetAudience } from "@/constants/fields-constants";
import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type Output = inferProcedureOutput<AppRouter["home"]["getPublicProducts"]>;
type Products = Output["products"];

function MedicineProductSection({
  products,
  isLoading,
}: {
  products: Products;
  isLoading: boolean;
}) {
  const foundField = targetAudience.find(
    (f) => f.slug.toLowerCase() === "medicine-health-sciences",
  );

  if (!foundField) return null;
  if (products.length === 0) return null;

  // Maximun of 12 products
  const maximumProducts = products.slice(0, 12);

  return (
    <ReusableProductSection
      sectionTitle={foundField.name}
      sectionDescription={foundField.description}
      loading={isLoading}
      display={`horizontal`}
      showSeeMore={maximumProducts.length > 4}
      products={maximumProducts}
    />
  );
}

export default MedicineProductSection;
