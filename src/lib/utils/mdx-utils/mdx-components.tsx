import React, { type ReactNode } from "react";
import {
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
} from "lucide-react";

interface Note {
  children: ReactNode;
  type?: "info" | "warning" | "success" | "error";
}

export const MDXComponents = {
  img: (props: any) => (
    <div className="my-4 rounded-lg overflow-hidden">
      <img
        {...props}
        alt={props.alt || "Article image"}
        className="w-full h-auto"
      />
    </div>
  ),

  video: ({ src, title }: any) => (
    <div className="my-4 rounded-lg overflow-hidden bg-muted">
      <video src={src} title={title} controls className="w-full h-auto" />
    </div>
  ),

  Note: ({ children, type = "info" }: Note) => {
    const bgColor = {
      info: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
      warning:
        "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800",
      success:
        "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
      error: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
    };

    const textColor = {
      info: "text-blue-900 dark:text-blue-100",
      warning: "text-amber-900 dark:text-amber-100",
      success: "text-green-900 dark:text-green-100",
      error: "text-red-900 dark:text-red-100",
    };

    const icon = {
      info: <Info className="w-5 h-5" />,
      warning: <AlertTriangle className="w-5 h-5" />,
      success: <CheckCircle2 className="w-5 h-5" />,
      error: <XCircle className="w-5 h-5" />,
    };

    return (
      <div className={`border-l-4 p-4 my-4 rounded ${bgColor[type]}`}>
        <div className={`flex gap-3 ${textColor[type]}`}>
          <span className="text-xl">{icon[type]}</span>
          <div className="flex-1">{children}</div>
        </div>
      </div>
    );
  },

  Warning: ({ children }: { children: ReactNode }) => (
    <div className="border-l-4 border-soraxi-warning bg-soraxi-warning/10 dark:bg-soraxi-warning/15 p-4 my-4 rounded">
      <div className="flex gap-3 text-amber-900 dark:text-amber-100">
        <AlertTriangle className="w-5 h-5" />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  ),

  Tip: ({ children }: { children: ReactNode }) => (
    <div className="border-l-4 border-soraxi-green bg-soraxi-success/10 dark:bg-soraxi-success/15 p-4 my-4 rounded">
      <div className="flex gap-3 text-soraxi-success dark:text-soraxi-success">
        <Lightbulb className="w-5 h-5" />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  ),

  YouTubeEmbed: ({ videoId }: { videoId: string }) => (
    <div className="my-4 rounded-lg overflow-hidden">
      <iframe
        width="100%"
        height="400"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="rounded-lg"
      />
    </div>
  ),

  Screenshot: ({ src, alt, caption }: any) => (
    <figure className="my-6">
      <div className="rounded-lg overflow-hidden border border-border">
        <img
          src={src || "/placeholder.svg"}
          alt={alt || "Screenshot"}
          className="w-full h-auto"
        />
      </div>
      {caption && (
        <figcaption className="text-sm text-muted-foreground text-center mt-2">
          {caption}
        </figcaption>
      )}
    </figure>
  ),

  Steps: ({ children }: { children: ReactNode }) => (
    <ol className="space-y-4 my-4 list-decimal list-inside">
      {React.Children.map(children, (child, idx) => (
        <li key={idx} className="text-base leading-relaxed">
          {child}
        </li>
      ))}
    </ol>
  ),

  h1: (props: any) => (
    <h1 className="text-4xl font-bold mt-8 mb-4 scroll-mt-20" {...props} />
  ),
  h2: (props: any) => (
    <h2
      className="text-2xl font-bold mt-8 mb-3 scroll-mt-20 text-primary"
      {...props}
    />
  ),
  h3: (props: any) => (
    <h3 className="text-xl font-semibold mt-6 mb-2 scroll-mt-20" {...props} />
  ),
  p: (props: any) => <p className="leading-relaxed mb-4" {...props} />,
  ul: (props: any) => (
    <ul className="list-disc list-inside space-y-2 mb-4 ml-4" {...props} />
  ),
  ol: (props: any) => (
    <ol className="list-decimal list-inside space-y-2 mb-4 ml-4" {...props} />
  ),
  li: (props: any) => <li className="mb-1" {...props} />,
  a: (props: any) => <a className="text-primary hover:underline" {...props} />,
  code: (props: any) => (
    <code className="bg-muted px-2 py-1 rounded text-sm font-mono" {...props} />
  ),
  pre: (props: any) => (
    <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4" {...props} />
  ),
  blockquote: (props: any) => (
    <blockquote
      className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground"
      {...props}
    />
  ),
  table: (props: any) => (
    <div className="overflow-x-auto my-4">
      <table
        className="w-full border-collapse border border-border"
        {...props}
      />
    </div>
  ),
  thead: (props: any) => <thead className="bg-muted" {...props} />,
  th: (props: any) => (
    <th
      className="border border-border p-2 text-left font-semibold"
      {...props}
    />
  ),
  td: (props: any) => <td className="border border-border p-2" {...props} />,
};
