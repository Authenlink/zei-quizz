"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"

type FilterInputProps = Omit<React.ComponentProps<typeof Input>, "onChange"> & {
  /** Valeur contrôlée affichée dans le champ. */
  value: string
  /** Appelé à chaque frappe (optionnel). */
  onValueChange?: (value: string) => void
  /** Appelé après 350 ms sans nouvelle frappe. */
  onDebouncedChange: (value: string) => void
  debounceMs?: number
}

/**
 * Recherche debouncée pour barres d’outils — même hauteur / bordure que FilterSelect.
 */
export function FilterInput({
  value,
  onValueChange,
  onDebouncedChange,
  debounceMs = 350,
  className,
  ...props
}: FilterInputProps) {
  const debounced = useDebouncedCallback(onDebouncedChange, debounceMs)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    onValueChange?.(v)
    debounced(v)
  }

  return (
    <div className="relative min-w-[160px] max-w-xs flex-1">
      <Search
        className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        value={value}
        onChange={handleChange}
        className={cn(
          "h-8 border-border/80 bg-transparent pl-9 shadow-none",
          className
        )}
        {...props}
      />
    </div>
  )
}
