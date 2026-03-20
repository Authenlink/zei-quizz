"use client"

import * as React from "react"

const DashboardScrollRefContext =
  React.createContext<React.RefObject<HTMLDivElement | null> | null>(null)

export function useDashboardScrollRef() {
  return React.useContext(DashboardScrollRefContext)
}

export function DashboardScrollArea({
  children,
}: {
  children: React.ReactNode
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  return (
    <DashboardScrollRefContext.Provider value={scrollRef}>
      <div
        ref={scrollRef}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto"
      >
        {children}
      </div>
    </DashboardScrollRefContext.Provider>
  )
}
