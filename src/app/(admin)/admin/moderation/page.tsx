import type { Metadata } from "next";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Message Moderation",
  description:
    "Conversations flagged by user reports or automatic contact detection.",
};

import { ModerationQueue } from "@/modules/admin/moderation/moderation-queue";

export default function AdminModerationPage() {
  return <ModerationQueue />;
}
