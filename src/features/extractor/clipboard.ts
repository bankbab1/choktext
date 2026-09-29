/**
 * Copies text to the clipboard. Falls back to select()+execCommand when the
 * async Clipboard API is unavailable or denied (some embedded browsers).
 */
export async function copyValue(
  text: string,
  fallbackEl: HTMLTextAreaElement | HTMLInputElement | null,
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    if (!fallbackEl) return false
    try {
      fallbackEl.focus()
      fallbackEl.select()
      return document.execCommand('copy')
    } catch {
      return false
    }
  }
}

export function insertAtCursor(el: HTMLTextAreaElement, text: string): string {
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const next = el.value.slice(0, start) + text + el.value.slice(end)
  requestAnimationFrame(() => {
    const pos = start + text.length
    el.selectionStart = el.selectionEnd = pos
  })
  return next
}
