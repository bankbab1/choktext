import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Merge, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AutoGrowTextarea } from './AutoGrowTextarea'
import { copyValue } from './clipboard'
import type { OrderRow } from './types'

interface OrderRowCardProps {
  row: OrderRow
  isFirst: boolean
  isLast: boolean
  onChange: (field: 'name' | 'menu', value: string) => void
  onDelete: () => void
  onMergeUp: () => void
  onMergeDown: () => void
}

// True only for an actual pasted-in line break (exactly two lines) — not
// for a long line that merely wraps visually. That's the ambiguous case a
// manual cut can produce (e.g. cutting across a real "Enter" by accident),
// where the value should probably read as one "A + B" entry instead.
function hasExactlyTwoLines(value: string): boolean {
  const lines = value.split('\n')
  return lines.length === 2 && lines.every((l) => l.trim().length > 0)
}

function joinLinesWithPlus(value: string): string {
  return value
    .split('\n')
    .map((l) => l.trim())
    .join(' + ')
}

function FieldCopyButton({ getValue }: { getValue: () => string }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className={cn('text-muted-foreground', copied && 'text-success')}
      aria-label="คัดลอก"
      onClick={async (e) => {
        const field = e.currentTarget
          .closest('.order-field')
          ?.querySelector('textarea') as HTMLTextAreaElement | null
        const ok = await copyValue(getValue(), field)
        if (ok) {
          clearTimeout(timerRef.current)
          setCopied(true)
          timerRef.current = setTimeout(() => setCopied(false), 1200)
        }
      }}
    >
      <Copy />
    </Button>
  )
}

function FieldMergeLinesButton({ onMerge }: { onMerge: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className="text-primary"
      aria-label='รวมเป็นบรรทัดเดียวด้วย "+"'
      title='ดูเหมือนมี Enter ขึ้นบรรทัดใหม่ — แตะเพื่อรวมเป็นบรรทัดเดียวด้วย "+"'
      onClick={onMerge}
    >
      <Merge />
    </Button>
  )
}

interface FieldBlockProps {
  label: string
  value: string
  onChange: (value: string) => void
  bold?: boolean
}

function FieldBlock({ label, value, onChange, bold }: FieldBlockProps) {
  const showMerge = hasExactlyTwoLines(value)
  return (
    <div className="order-field border-b-[0.5px] border-border/70 px-3.5 pt-2.5 pb-2">
      <div className="mb-0.5 flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <div className="-mr-1 flex items-center gap-0.5">
          {showMerge && <FieldMergeLinesButton onMerge={() => onChange(joinLinesWithPlus(value))} />}
          <FieldCopyButton getValue={() => value} />
        </div>
      </div>
      <AutoGrowTextarea
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full border-0 bg-transparent p-0 text-base text-foreground outline-none',
          bold && 'font-semibold',
        )}
      />
    </div>
  )
}

export function OrderRowCard({
  row,
  isFirst,
  isLast,
  onChange,
  onDelete,
  onMergeUp,
  onMergeDown,
}: OrderRowCardProps) {
  return (
    <div
      className={cn(
        'mb-3 overflow-hidden rounded-2xl bg-card',
        row.flagged
          ? 'bg-warning/10 shadow-[inset_0_0_0_1px_var(--warning)]'
          : 'shadow-[inset_0_0_0_0.5px_var(--border)]',
      )}
    >
      <FieldBlock label="Name" value={row.name} onChange={(v) => onChange('name', v)} bold />
      <FieldBlock label="Menu" value={row.menu} onChange={(v) => onChange('menu', v)} />

      <div className="flex justify-end gap-2.5 px-3 py-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="rounded-full"
          disabled={isFirst}
          aria-label="รวมกับแถวก่อนหน้า"
          onClick={onMergeUp}
        >
          <ChevronUp />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="rounded-full"
          disabled={isLast}
          aria-label="รวมกับแถวถัดไป"
          onClick={onMergeDown}
        >
          <ChevronDown />
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="rounded-full"
          aria-label="ลบแถวนี้"
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  )
}
