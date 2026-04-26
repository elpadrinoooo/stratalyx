import { useEffect, type RefObject } from 'react'

/**
 * Trap Tab/Shift+Tab focus inside the given container, restore focus to the
 * previously-active element on unmount, and lock body scroll while active.
 * Intended for modals — pairs with role="dialog" + aria-modal="true".
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active = true): void {
  useEffect(() => {
    if (!active) return
    const container = ref.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusables = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(
        'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
      )).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null)

    const handleTab = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return
      const list = focusables()
      if (list.length === 0) {
        e.preventDefault()
        return
      }
      const first = list[0]
      const last  = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleTab)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleTab)
      document.body.style.overflow = ''
      previouslyFocused?.focus?.()
    }
  }, [ref, active])
}
