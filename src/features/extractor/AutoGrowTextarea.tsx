import { forwardRef, useLayoutEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

function setRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === 'function') ref(value)
  else if (ref) (ref as React.RefObject<T | null>).current = value
}

/**
 * A textarea that grows to fit its content — no clipped or scrolling text.
 * `field-sizing: content` (in the base shadcn Textarea) does this natively
 * in Chromium, but Safari doesn't support it yet, so this measures
 * `scrollHeight` on every value change as a reliable fallback everywhere.
 */
export const AutoGrowTextarea = forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, value, onInput, ...props }, forwardedRef) => {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)

  const grow = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useLayoutEffect(() => {
    grow(innerRef.current)
  }, [value])

  return (
    <textarea
      ref={(el) => {
        innerRef.current = el
        setRef(forwardedRef, el)
      }}
      value={value}
      onInput={(e) => {
        grow(e.currentTarget)
        onInput?.(e)
      }}
      className={cn('resize-none overflow-hidden', className)}
      {...props}
    />
  )
})
AutoGrowTextarea.displayName = 'AutoGrowTextarea'
