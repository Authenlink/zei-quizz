import { type RefObject, useEffect, useState } from "react";

/** Détection de scroll sur la fenêtre (pages sans layout dashboard). */
export function useScroll() {
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 0);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return hasScrolled;
}

/**
 * À utiliser avec le conteneur scrollable du layout `(dashboard)` —
 * voir `useDashboardScrollRef()`.
 */
export function useScrollContainer(
  scrollRef: RefObject<HTMLElement | null> | null | undefined
) {
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;

    const handleScroll = () => setHasScrolled(el.scrollTop > 0);
    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollRef]);

  return hasScrolled;
}
