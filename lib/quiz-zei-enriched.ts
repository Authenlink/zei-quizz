type LessonRow = {
  type: "lesson" | "regulatory_update" | "case_study" | "zei_spotlight";
  content: unknown;
};

function contentHasVuParZeiCallout(content: unknown): boolean {
  if (!Array.isArray(content)) return false;
  for (const block of content) {
    if (
      block &&
      typeof block === "object" &&
      (block as { type?: string }).type === "callout" &&
      (block as { title?: string }).title === "Vu par ZEI"
    ) {
      return true;
    }
  }
  return false;
}

/** Module « enrichi ZEI » : au moins une leçon `zei_spotlight` ou un callout « Vu par ZEI » dans le JSON. */
export function isZeiEnrichedModuleLessons(lessons: LessonRow[]): boolean {
  return lessons.some(
    (l) => l.type === "zei_spotlight" || contentHasVuParZeiCallout(l.content),
  );
}
