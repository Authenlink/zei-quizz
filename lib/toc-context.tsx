"use client";

import * as React from "react";

export type TocItem = {
  id: string;
  title: string;
  level: 1 | 2 | 3;
};

type TocContextValue = {
  items: TocItem[];
  activeId: string | null;
  setItems: (items: TocItem[]) => void;
  setActiveId: (id: string | null) => void;
};

const TocContext = React.createContext<TocContextValue | null>(null);

export function TocProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<TocItem[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  return (
    <TocContext.Provider value={{ items, activeId, setItems, setActiveId }}>
      {children}
    </TocContext.Provider>
  );
}

export function useToc(): TocContextValue {
  const ctx = React.useContext(TocContext);
  if (!ctx) {
    throw new Error("useToc must be used within a TocProvider");
  }
  return ctx;
}
