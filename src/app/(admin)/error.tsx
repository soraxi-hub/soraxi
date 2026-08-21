"use client";

import { SegmentError } from "@/components/errors/segment-error";

/**
 * Segment error boundary. Keeps this segment's layout mounted (nav, shell)
 * while the failed subtree is replaced, so a failure here does not unwind to
 * the root boundary and blank the whole chrome.
 */
export default SegmentError;
