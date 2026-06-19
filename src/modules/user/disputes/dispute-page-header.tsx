interface DisputePageHeaderProps {
  orderId: string;
  disputeId: string;
}

export function DisputePageHeader({ disputeId }: DisputePageHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Dispute Details
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            #{disputeId.slice(-8).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
