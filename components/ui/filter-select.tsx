"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type FilterSelectProps = {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  /** Icône à gauche du libellé (barres d’outils / filtres). */
  icon: LucideIcon
  iconColorClass?: string
  "aria-label"?: string
  className?: string
  children: React.ReactNode
}

/**
 * Select compact pour barres d’outils (statut, tri, etc.) — aligné avec FilterInput.
 */
export function FilterSelect({
  value,
  onValueChange,
  placeholder,
  icon: Icon,
  iconColorClass,
  "aria-label": ariaLabel,
  className,
  children,
}: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel}
        className={cn(
          "h-8 min-w-[140px] gap-2 border-border/80 shadow-none",
          className
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0 text-muted-foreground",
            iconColorClass
          )}
        />
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  )
}
