export const dynamic = "force-dynamic";

import { ModerationQueue } from "@/modules/admin/moderation/moderation-queue";

/**
 * Admin Message Moderation Page
 * Conversations flagged by user reports or automatic contact detection.
 * Route: /admin/moderation
 */
export default function AdminModerationPage() {
  return <ModerationQueue />;
}
