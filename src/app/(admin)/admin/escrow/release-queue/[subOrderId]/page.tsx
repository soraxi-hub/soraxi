import EscrowReleaseDetail from "@/modules/admin/escrow/EscrowReleaseDetail";

interface EscrowReleaseDetailPageProps {
  params: Promise<{
    subOrderId: string;
  }>;
}

export default async function EscrowReleaseDetailPage({
  params,
}: EscrowReleaseDetailPageProps) {
  const { subOrderId } = await params;

  return <EscrowReleaseDetail subOrderId={subOrderId} />;
}
