"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Sonner ne définit --normal-bg que pour data-sonner-theme=light|dark.
 * next-themes peut exposer des noms custom (ex. « white ») : on mappe toujours
 * vers light / dark / system pour éviter des toasts au fond transparent.
 */
function resolveSonnerTheme(
  theme: string | undefined,
  resolvedTheme: string | undefined
): "light" | "dark" | "system" {
  if (theme === "system") return "system"
  return resolvedTheme === "dark" ? "dark" : "light"
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme, resolvedTheme } = useTheme()
  const sonnerTheme = resolveSonnerTheme(theme, resolvedTheme)

  return (
    <Sonner
      theme={sonnerTheme}
      className="toaster group"
      richColors
      toastOptions={{
        classNames: {
          toast: "shadow-lg backdrop-blur-sm",
          description: "text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
