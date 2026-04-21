import React from "react";
import Image from "next/image";

import { useSortable } from "@dnd-kit/react/sortable";
import { DragDropProvider } from "@dnd-kit/react";
import { siteConfig } from "@/config/site";

const Sortable = React.memo(function Sortable({
  id,
  url,
  index,
}: {
  id: string;
  url: string;
  index: number;
}) {
  const { ref, isDragging } = useSortable({
    id,
    index,
    type: "item",
    accept: "item",
  });

  return (
    <li
      ref={ref}
      data-dragging={isDragging}
      className="relative w-28 h-28 rounded-xl overflow-hidden border bg-gray-50 transition data-[dragging=true]:opacity-50 cursor-grab active:cursor-grabbing"
    >
      <Image
        src={url || siteConfig.placeHolderImg}
        alt={`Product ${index + 1}`}
        fill
        className="object-cover"
      />

      <span className="absolute top-1 left-1 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
        {index + 1}
      </span>
    </li>
  );
});

export function ReOrderIMGs({
  images,
  setImages,
}: {
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  return (
    <DragDropProvider
      onDragOver={(event) => {
        const { source, target } = event.operation;

        if (!target || !source || source.id === target.id) return;

        setImages((prev) => {
          const oldIndex = prev.findIndex((i) => i === source.id);
          const newIndex = prev.findIndex((i) => i === target.id);

          // IMPORTANT: prevent array corruption
          if (oldIndex === -1 || newIndex === -1) return prev;

          // Prevent unnecessary updates
          if (oldIndex === newIndex) return prev;

          const updated = [...prev];
          const [moved] = updated.splice(oldIndex, 1);
          updated.splice(newIndex, 0, moved);

          return updated;
        });
      }}
    >
      <ul className="flex flex-wrap gap-4 w-full p-3">
        {images.map((url, index) => (
          <Sortable key={url} id={url} url={url} index={index} />
        ))}
      </ul>
    </DragDropProvider>
  );
}
