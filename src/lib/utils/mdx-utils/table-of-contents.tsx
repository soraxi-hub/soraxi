"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  className?: string;
}

export function TableOfContents({ className }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const extractHeadings = () => {
      const mainContent = document.querySelector(".prose-content");
      if (!mainContent) return;

      const headingElements = mainContent.querySelectorAll("h2, h3");
      const extractedHeadings: Heading[] = [];

      headingElements.forEach((element, index) => {
        let id = element.id;
        if (!id) {
          id = `heading-${index}`;
          element.id = id;
        }

        extractedHeadings.push({
          id,
          text: element.textContent || "",
          level: Number.parseInt(element.tagName[1]),
        });
      });

      setHeadings(extractedHeadings);
    };

    extractHeadings();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "0px 0px -66% 0px" }
    );

    const mainContent = document.querySelector(".prose-content");
    if (mainContent) {
      mainContent.querySelectorAll("h2, h3").forEach((el) => {
        observer.observe(el);
      });
    }

    return () => observer.disconnect();
  }, []);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className={cn("text-sm space-y-2", className)}>
      <ScrollArea className="h-full md:h-[calc(100vh-2rem)] p-4">
        <div className="font-semibold text-primary mb-4">On this page</div>
        <ul className="space-y-2">
          {headings.map((heading) => (
            <li key={heading.id} className={heading.level === 3 ? "ml-4" : ""}>
              <Link
                href={`#${heading.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById(heading.id);
                  element?.scrollIntoView({ behavior: "smooth" });
                }}
                className={cn(
                  "toc-link transition-colors py-1 block text-foreground/70 hover:text-soraxi-green-hover",
                  activeId === heading.id &&
                    "toc-link-active text-soraxi-green font-semibold border-l-2 border-soraxi-green pl-2"
                )}
              >
                {heading.text}
              </Link>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </nav>
  );
}
