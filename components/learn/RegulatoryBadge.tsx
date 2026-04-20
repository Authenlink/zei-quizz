import { cn } from "@/lib/utils";
import { YearTag } from "./YearTag";

type CompanySize = "all" | "large" | "sme";

const COMPANY_SIZE_LABEL: Record<CompanySize, string> = {
  all: "Toutes entreprises",
  large: "Grandes entreprises",
  sme: "PME",
};

interface RegulatoryBadgeProps {
  applicableYear?: number | null;
  companySize?: CompanySize;
  className?: string;
}

export function RegulatoryBadge({
  applicableYear,
  companySize = "all",
  className,
}: RegulatoryBadgeProps) {
  const sizeLabel = COMPANY_SIZE_LABEL[companySize] ?? COMPANY_SIZE_LABEL.all;

  if (!applicableYear && companySize === "all") return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs",
        "bg-muted/50 border-border",
        className
      )}
    >
      {applicableYear && <YearTag year={applicableYear} />}
      <span className="text-muted-foreground">{sizeLabel}</span>
    </div>
  );
}
