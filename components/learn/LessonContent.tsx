import { cn } from "@/lib/utils";
import { RegulatoryBadge } from "./RegulatoryBadge";
import { YearTag } from "./YearTag";

// ---------------------------------------------------------------------------
// Content block types (stored as JSONB in quiz_lessons.content)
// ---------------------------------------------------------------------------

export type ContentBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; style?: "bullet" | "ordered"; items: string[] }
  | {
      type: "callout";
      variant: "info" | "warning" | "tip" | "important";
      title?: string;
      text: string;
    }
  | {
      type: "table";
      headers: string[];
      rows: string[][];
    }
  | { type: "divider" }
  | { type: "regulatory_note"; year?: number; companySize?: "all" | "large" | "sme"; text: string }
  | { type: "sources"; items: { label: string; url: string }[] };

export type LessonContentData = ContentBlock[];

// ---------------------------------------------------------------------------
// Sub-renderers
// ---------------------------------------------------------------------------

const CALLOUT_STYLES = {
  info: {
    container: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40",
    title: "text-blue-700 dark:text-blue-300",
    text: "text-blue-800 dark:text-blue-200",
    icon: "ℹ️",
  },
  warning: {
    container: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
    title: "text-amber-700 dark:text-amber-300",
    text: "text-amber-800 dark:text-amber-200",
    icon: "⚠️",
  },
  tip: {
    container: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
    title: "text-emerald-700 dark:text-emerald-300",
    text: "text-emerald-800 dark:text-emerald-200",
    icon: "💡",
  },
  important: {
    container: "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40",
    title: "text-rose-700 dark:text-rose-300",
    text: "text-rose-800 dark:text-rose-200",
    icon: "🔴",
  },
};

function RenderBlock({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "heading":
      if (block.level === 2) {
        return (
          <h2 className="text-xl font-semibold tracking-tight mt-6 first:mt-0">
            {block.text}
          </h2>
        );
      }
      return (
        <h3 className="text-base font-semibold mt-4 first:mt-0">
          {block.text}
        </h3>
      );

    case "paragraph":
      return (
        <p className="text-sm leading-relaxed text-foreground/90">{block.text}</p>
      );

    case "list": {
      const isOrdered = block.style === "ordered";
      const Tag = isOrdered ? "ol" : "ul";
      return (
        <Tag
          className={cn(
            "pl-5 space-y-1 text-sm text-foreground/90",
            isOrdered ? "list-decimal" : "list-disc"
          )}
        >
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </Tag>
      );
    }

    case "callout": {
      const style = CALLOUT_STYLES[block.variant] ?? CALLOUT_STYLES.info;
      return (
        <div className={cn("rounded-md border p-4 space-y-1", style.container)}>
          {block.title ? (
            <p className={cn("text-sm font-semibold", style.title)}>
              {style.icon} {block.title}
            </p>
          ) : null}
          <p className={cn("text-sm leading-relaxed", style.text)}>
            {!block.title && `${style.icon} `}
            {block.text}
          </p>
        </div>
      );
    }

    case "table":
      return (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {block.headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-2 text-left font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b last:border-0 even:bg-muted/20">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2 text-foreground/90">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "divider":
      return <hr className="border-border" />;

    case "regulatory_note":
      return (
        <div className="rounded-md border border-dashed border-muted-foreground/30 p-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            {block.year && <YearTag year={block.year} />}
            {block.companySize && block.companySize !== "all" && (
              <RegulatoryBadge companySize={block.companySize} />
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{block.text}</p>
        </div>
      );

    case "sources":
      return (
        <div className="rounded-md border border-muted bg-muted/30 px-4 py-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Sources
          </p>
          <ul className="space-y-0.5">
            {block.items.map((item, i) => (
              <li key={i} className="text-xs">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity break-all"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface LessonContentProps {
  content: unknown;
  className?: string;
}

export function LessonContent({ content, className }: LessonContentProps) {
  if (!Array.isArray(content) || content.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Contenu non disponible.
      </p>
    );
  }

  const blocks = content as ContentBlock[];

  return (
    <div className={cn("space-y-4", className)}>
      {blocks.map((block, i) => (
        <RenderBlock key={i} block={block} />
      ))}
    </div>
  );
}
