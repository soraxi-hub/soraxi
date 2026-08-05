"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { MessageReportReasonEnum } from "@/enums";
import { useTRPC } from "@/trpc/client";
import type { MessagingRole } from "../messaging-client";

const REASON_LABELS: Record<MessageReportReasonEnum, string> = {
  [MessageReportReasonEnum.Scam]: "Scam or fraud",
  [MessageReportReasonEnum.OffPlatformPayment]: "Asking to pay outside Soraxi",
  [MessageReportReasonEnum.Harassment]: "Harassment or abuse",
  [MessageReportReasonEnum.Spam]: "Spam",
  [MessageReportReasonEnum.Other]: "Something else",
};

/**
 * Reports a conversation to moderators.
 *
 * Fixed reason categories rather than free text alone: a queue of unstructured
 * complaints cannot be triaged once there is any volume, and "asking to pay
 * outside Soraxi" is the category worth being able to count.
 *
 * The copy promises review, not action, and says plainly that reporting does
 * not block the other party — because it doesn't, and letting someone believe
 * otherwise would leave them exposed while they wait.
 */
export function ReportDialog({
  conversationId,
  role,
}: {
  conversationId: string;
  role: MessagingRole;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<MessageReportReasonEnum>(
    MessageReportReasonEnum.Scam,
  );
  const [note, setNote] = useState("");

  const trpc = useTRPC();

  const api = role === "vendor" ? trpc.vendorMessaging : trpc.customerMessaging;

  const report = useMutation({
    ...api.reportConversation.mutationOptions(),
    onSuccess: () => {
      toast.success("Thanks — our team will review this conversation.");
      setOpen(false);
      setNote("");
    },
    onError: (error) => {
      toast.error(error.message || "Could not submit your report");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Report this conversation"
          className="size-4 sm:size-9 shrink-0 text-muted-foreground hover:text-soraxi-error"
        >
          <Flag className="size-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this conversation</DialogTitle>
          <DialogDescription>
            Our team will review the messages here. Reporting doesn&apos;t block
            the other person — if you feel unsafe, stop replying and contact
            support.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-reason">What&apos;s wrong?</Label>
            <Select
              value={reason}
              onValueChange={(value) =>
                setReason(value as MessageReportReasonEnum)
              }
            >
              <SelectTrigger id="report-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REASON_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-note">
              Anything else?{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="report-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Tell us what happened"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={report.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              report.mutate({
                conversationId,
                reason,
                note: note.trim() || undefined,
              })
            }
            disabled={report.isPending}
            className="gap-2 bg-soraxi-green text-white hover:bg-soraxi-green-hover"
          >
            {report.isPending && <Spinner className="size-4" />}
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
