"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { FeedbackPopup } from "./feedback-popup";
import { FeedbackPageEnum } from "@/enums";

interface FeedbackButtonProps {
  page: FeedbackPageEnum;
}

type Side = "left" | "right";
type Position = { side: Side; top: number };

const STORAGE_KEY = "feedback_button_position";
const BUTTON_SIZE = 48; // matches h-12/w-12
const EDGE_MARGIN = 24; // matches the old bottom-6/right-6 (1.5rem)
const DRAG_THRESHOLD = 5; // px of movement before a press counts as a drag, not a click

function readStoredPosition(): Position | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      (parsed.side === "left" || parsed.side === "right") &&
      typeof parsed.top === "number"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredPosition(position: Position) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {
    // ignore storage failures (e.g. private browsing)
  }
}

function clampTop(top: number) {
  const maxTop = Math.max(window.innerHeight - BUTTON_SIZE - EDGE_MARGIN, EDGE_MARGIN);
  return Math.min(Math.max(top, EDGE_MARGIN), maxTop);
}

/**
 * Persistent, click-triggered feedback entry point. Draggable vertically;
 * on release it clips to whichever side of the screen it's nearer to, so it
 * never ends up stuck mid-content. Position persists per browser.
 */
export function FeedbackButton({ page }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position>({ side: "right", top: 0 });
  const dragState = useRef<{ startX: number; startY: number; moved: boolean } | null>(
    null
  );
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const stored = readStoredPosition();
    setPosition(
      stored ?? {
        side: "right",
        top: clampTop(window.innerHeight - BUTTON_SIZE - EDGE_MARGIN),
      }
    );
    setIsReady(true);

    const handleResize = () => {
      setPosition((prev) => ({ ...prev, top: clampTop(prev.top) }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragState.current = { startX: e.clientX, startY: e.clientY, moved: false };
    buttonRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragState.current) return;

    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;

    if (!dragState.current.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      dragState.current.moved = true;
      setIsDragging(true);
    }

    if (dragState.current.moved) {
      setPosition((prev) => ({ ...prev, top: clampTop(e.clientY - BUTTON_SIZE / 2) }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    buttonRef.current?.releasePointerCapture(e.pointerId);
    const wasDragging = dragState.current?.moved ?? false;
    dragState.current = null;

    if (!wasDragging) {
      setIsOpen(true);
      return;
    }

    const snappedSide: Side = e.clientX < window.innerWidth / 2 ? "left" : "right";
    setPosition((prev) => {
      const next: Position = { side: snappedSide, top: prev.top };
      writeStoredPosition(next);
      return next;
    });
    setIsDragging(false);
  };

  if (!isReady) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        aria-label="Send feedback"
        style={{ top: position.top, [position.side]: EDGE_MARGIN, touchAction: "none" }}
        className={`fixed z-40 flex h-12 w-12 select-none items-center justify-center rounded-full bg-soraxi-green text-white shadow-lg transition-colors hover:bg-soraxi-green-hover ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <MessageSquare className="h-5 w-5" />
      </button>
      <FeedbackPopup
        isOpen={isOpen}
        onCloseAction={() => setIsOpen(false)}
        page={page}
      />
    </>
  );
}
