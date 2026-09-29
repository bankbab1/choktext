import { useRef, useState } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Scissors,
  Trash2,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { copyValue } from './clipboard'
import type { ManualState } from './types'

interface ManualCutterProps {
  manualState: ManualState
  canUndo: boolean
  onNav: (kind: 'charBack' | 'charForward' | 'wordBack' | 'wordForward') => void
  onCut: (kind: 'assign' | 'discard') => void
  onUndo: () => void
  onQuickCut: () => string | null
}

export function ManualCutter({
  manualState,
  canUndo,
  onNav,
  onCut,
  onUndo,
  onQuickCut,
}: ManualCutterProps) {
  const { text, pos, hasName, buildingName } = manualState
  const [quickCutStatus, setQuickCutStatus] = useState<{ tone: 'ok' | 'err'; message: string } | null>(null)
  const fallbackRef = useRef<HTMLTextAreaElement>(null)
  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const atStart = pos === 0
  const atEnd = pos >= text.length
  const isDone = text.length === 0 && !hasName

  const handleQuickCut = async () => {
    const cutValue = onQuickCut()
    if (!cutValue) return
    if (fallbackRef.current) fallbackRef.current.value = cutValue
    const ok = await copyValue(cutValue, fallbackRef.current)
    clearTimeout(statusTimer.current)
    setQuickCutStatus(
      ok ? { tone: 'ok', message: `คัดลอกแล้ว: "${cutValue}"` } : { tone: 'err', message: 'คัดลอกอัตโนมัติไม่สำเร็จ' },
    )
    statusTimer.current = setTimeout(() => setQuickCutStatus(null), 2500)
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl bg-card shadow-[inset_0_0_0_0.5px_var(--border)]">
      <div className="flex items-center px-3.5 pt-3">
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide text-white transition-colors',
            hasName ? 'bg-success' : 'bg-primary',
          )}
        >
          {hasName ? 'MENU' : 'NAME'}
        </span>
      </div>

      <div className="mx-3.5 mt-2.5 overflow-hidden rounded-xl border border-dashed border-border">
        <div
          className={cn(
            'border-b-[0.5px] border-border px-3 py-2 transition-colors',
            !hasName && 'bg-primary/10',
          )}
        >
          <span className="block text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
            Name
          </span>
          {hasName ? (
            <span className="text-sm font-semibold text-foreground">{buildingName}</span>
          ) : (
            <span className="animate-pulse text-sm text-muted-foreground italic">กำลังเลือกอยู่…</span>
          )}
        </div>
        <div className={cn('px-3 py-2 transition-colors', hasName && 'bg-success/10')}>
          <span className="block text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
            Menu
          </span>
          {hasName ? (
            <span className="animate-pulse text-sm text-muted-foreground italic">กำลังเลือกอยู่…</span>
          ) : (
            <span className="text-sm text-muted-foreground italic">รอตัด Name ก่อน</span>
          )}
        </div>
      </div>

      <div className="mx-3.5 mt-2.5 max-h-64 min-h-[120px] overflow-y-auto rounded-xl px-3.5 py-2.5 text-base leading-relaxed whitespace-pre-wrap">
        <span
          className={cn(
            'rounded-[3px] box-decoration-clone',
            hasName ? 'bg-success/25' : 'bg-primary/20',
          )}
        >
          {text.slice(0, pos)}
        </span>
        <span
          className={cn(
            'mx-[-1px] inline-block h-[1.1em] w-[2px] animate-[manual-caret-blink_1s_step-start_infinite] align-text-bottom',
            hasName ? 'bg-success' : 'bg-primary',
          )}
        />
        <span>{text.slice(pos)}</span>
      </div>

      <div className="mt-2.5 flex items-center gap-2 px-3.5">
        <Button
          type="button"
          variant="secondary"
          disabled={atStart}
          aria-label="ถอยทีละตัวอักษร"
          className="h-13 flex-1 rounded-2xl"
          onClick={() => onNav('charBack')}
        >
          <ChevronLeft className="size-5.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={atStart}
          aria-label="ถอยทีละคำ"
          className="h-13 flex-1 rounded-2xl"
          onClick={() => onNav('wordBack')}
        >
          <ChevronsLeft className="size-5.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={atEnd}
          aria-label="ถัดไปทีละคำ"
          className="h-13 flex-1 rounded-2xl"
          onClick={() => onNav('wordForward')}
        >
          <ChevronsRight className="size-5.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={atEnd}
          aria-label="ถัดไปทีละตัวอักษร"
          className="h-13 flex-1 rounded-2xl"
          onClick={() => onNav('charForward')}
        >
          <ChevronRight className="size-5.5" />
        </Button>
      </div>

      <div className="mt-2 flex items-center gap-2 px-3.5">
        <Button
          type="button"
          variant="secondary"
          disabled={atStart}
          className="h-9.5 flex-1 text-primary"
          onClick={handleQuickCut}
        >
          <Scissors />
          ตัด+คัดลอกด่วน
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="rounded-full"
          disabled={atStart}
          aria-label="ลบข้อความที่เลือกทิ้ง"
          onClick={() => onCut('discard')}
        >
          <Trash2 />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="rounded-full"
          disabled={!canUndo}
          aria-label="ย้อนการตัดล่าสุด"
          onClick={onUndo}
        >
          <Undo2 />
        </Button>
      </div>

      {quickCutStatus && (
        <p
          className={cn(
            'mt-1.5 px-3.5 text-[12.5px] break-words',
            quickCutStatus.tone === 'ok' ? 'text-success' : 'text-destructive',
          )}
        >
          {quickCutStatus.message}
        </p>
      )}

      <Button
        type="button"
        disabled={atStart}
        className="mx-3.5 mt-3 mb-3.5 h-12 rounded-xl"
        style={{ width: 'calc(100% - 1.75rem)' }}
        onClick={() => onCut('assign')}
      >
        <Check />
        ตัดไปเป็น {hasName ? 'MENU' : 'NAME'}
      </Button>

      {isDone && (
        <p className="mt-[-8px] mb-3.5 px-3.5 text-center text-[13px] text-success">
          ตัดข้อความครบแล้ว — เลื่อนลงไปตรวจสอบรายการด้านล่าง
        </p>
      )}

      <textarea ref={fallbackRef} readOnly className="sr-only" tabIndex={-1} aria-hidden />
    </div>
  )
}
