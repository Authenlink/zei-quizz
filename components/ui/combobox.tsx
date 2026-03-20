"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type ComboboxOption = {
  value: string
  label: string
  disabled?: boolean
}

type ComboboxProps = {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  "aria-label"?: string
  filterFunction?: (option: ComboboxOption, search: string) => boolean
  onSearchChange?: (search: string) => void
}

const defaultFilter = (option: ComboboxOption, search: string) =>
  option.label.toLowerCase().includes(search.trim().toLowerCase())

/**
 * Liste searchable (client) — longues listes ; pour peu d’options préférer Select / FilterSelect.
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Choisir…",
  searchPlaceholder = "Rechercher…",
  emptyText = "Aucun résultat.",
  disabled,
  className,
  "aria-label": ariaLabel,
  filterFunction = defaultFilter,
  onSearchChange,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [highlighted, setHighlighted] = React.useState(0)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  const filtered = React.useMemo(
    () => options.filter((o) => filterFunction(o, search)),
    [options, search, filterFunction]
  )

  const selected = options.find((o) => o.value === value)

  React.useEffect(() => {
    onSearchChange?.(search)
  }, [search, onSearchChange])

  React.useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  React.useEffect(() => {
    if (open) {
      setHighlighted(0)
      setSearch("")
    }
  }, [open])

  React.useEffect(() => {
    if (highlighted < filtered.length) return
    setHighlighted(filtered.length ? filtered.length - 1 : 0)
  }, [filtered.length, highlighted])

  const selectIndex = (i: number) => {
    const opt = filtered[i]
    if (!opt || opt.disabled) return
    onValueChange(opt.value)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === "Escape") {
      e.preventDefault()
      setOpen(false)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)))
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      selectIndex(highlighted)
    }
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative w-full max-w-sm", className)}
      onKeyDown={onKeyDown}
    >
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        className="h-9 w-full justify-between font-normal shadow-xs"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </Button>
      {open && (
        <div
          className="bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 z-[100] mt-1 flex max-h-[300px] flex-col overflow-hidden rounded-md border p-0 shadow-md"
          role="listbox"
        >
          <div className="border-b p-2">
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
              autoFocus
            />
          </div>
          <ul ref={listRef} className="overflow-auto p-1">
            {filtered.length === 0 ? (
              <li className="text-muted-foreground px-2 py-3 text-center text-sm">
                {emptyText}
              </li>
            ) : (
              filtered.map((opt, i) => (
                <li key={opt.value} role="option" aria-selected={value === opt.value}>
                  <button
                    type="button"
                    disabled={opt.disabled}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none",
                      i === highlighted && "bg-accent text-accent-foreground",
                      opt.disabled && "pointer-events-none opacity-50"
                    )}
                    onMouseEnter={() => setHighlighted(i)}
                    onClick={() => selectIndex(i)}
                  >
                    <Check
                      className={cn(
                        "size-4 shrink-0",
                        value === opt.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{opt.label}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
