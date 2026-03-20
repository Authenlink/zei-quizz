import { useCallback, useEffect, useRef } from "react"

export function useDebouncedCallback<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  const fnRef = useRef(fn)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  return useCallback(
    (...args: Args) => {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        fnRef.current(...args)
      }, delay)
    },
    [delay]
  )
}
