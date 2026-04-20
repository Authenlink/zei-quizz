"use client";

import * as React from "react";
import { useToc, type TocItem } from "@/lib/toc-context";

/**
 * useSetToc — call this in any page to declare its table-of-contents sections.
 *
 * Pass an empty array or nothing to hide the ToC sidebar on pages that
 * don't have structured content (dashboard, profile, …).
 *
 * Also sets up an IntersectionObserver to automatically highlight the
 * section heading that is currently in view.
 *
 * @example
 * const items: TocItem[] = [
 *   { id: "intro", title: "Introduction", level: 1 },
 *   { id: "csrd-2025", title: "CSRD 2025", level: 2 },
 * ];
 * useSetToc(items);
 *
 * // In your JSX, add matching ids to headings:
 * <h2 id="csrd-2025">CSRD 2025</h2>
 */
export function useSetToc(items: TocItem[]) {
  const { setItems, setActiveId } = useToc();

  // Sync items into context whenever they change
  React.useEffect(() => {
    setItems(items);
    return () => setItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);

  // IntersectionObserver: track which heading is in view
  React.useEffect(() => {
    if (items.length === 0) {
      setActiveId(null);
      return;
    }

    const headingIds = items.map((i) => i.id);

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first intersecting entry (top-most visible heading)
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "0px 0px -80% 0px",
        threshold: 0,
      }
    );

    headingIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);
}
