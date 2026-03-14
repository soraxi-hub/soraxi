import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import ResuableRequestSection from "./resuable-request-section";

type Output = inferProcedureOutput<
  AppRouter["demandListing"]["getAllRequests"]
>;
type Requests = Output["requests"];

function DemandListingSection({
  demands,
  isLoading,
}: {
  demands: Requests;
  isLoading: boolean;
}) {
  if (demands.length === 0 && !isLoading) return null;

  // Maximun of 12 listings
  const maximumDemands = demands.slice(0, 12);

  return (
    <ResuableRequestSection
      sectionTitle={"In Demand Products"}
      sectionDescription={"Products students are actively looking for."}
      loading={isLoading}
      showSeeMore={maximumDemands.length > 4}
      demands={maximumDemands}
    />
  );
}

export default DemandListingSection;
