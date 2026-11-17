import * as React from "react"

const MOBILE_BREAKPOINT = 768

const query = () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

/**
 * Hook nhận biết màn hình hẹp (dưới `md`).
 *
 * Dùng `useSyncExternalStore` để theo dõi `matchMedia` mà không setState
 * trong effect (tránh render dây chuyền).
 */
export function useIsMobile() {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    const mediaQuery = query()
    mediaQuery.addEventListener("change", onStoreChange)
    return () => mediaQuery.removeEventListener("change", onStoreChange)
  }, [])

  const getSnapshot = React.useCallback(
    () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches,
    []
  )

  const getServerSnapshot = () => false

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
