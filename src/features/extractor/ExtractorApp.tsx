import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeftRight,
  Check,
  Clipboard,
  ClipboardPaste,
  List,
  MessageSquareText,
  Moon,
  Plus,
  RotateCcw,
  Scissors,
  Sun,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'
import { AutoGrowTextarea } from './AutoGrowTextarea'
import { ClearConfirmDrawer } from './ClearConfirmDrawer'
import { ManualCutter } from './ManualCutter'
import { OrderRowCard } from './OrderRowCard'
import { countQty, sanitizeForSheets } from './textParsing'
import { useExtractor } from './useExtractor'

const MODES = ['manual', 'auto'] as const

function StepHeader({ n, label }: { n: number; label: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="flex size-5.5 flex-none items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
        {n}
      </span>
      <p className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
    </div>
  )
}

export function ExtractorApp() {
  const { theme, toggle: toggleTheme } = useTheme()

  const api = useExtractor()
  const {
    rawText,
    setRawText,
    rows,
    mode,
    setMode,
    manualState,
    canUndo,
    copyStatus,
    clearDrawerOpen,
    requestClear,
    cancelClear,
    confirmClear,
    runAutoParse,
    startManualCut,
    manualNav,
    manualCut,
    manualUndo,
    manualQuickCut,
    addRow,
    clearRows,
    updateRow,
    deleteRow,
    mergeRow,
    buildTsv,
    copyAllForSheets,
    pasteIntoRawText,
    menuFirst,
    toggleColumnOrder,
    qtyEnabled,
    toggleQty,
  } = api

  const [navCollapsed, setNavCollapsed] = useState(false)
  const [pasteHint, setPasteHint] = useState<string | null>(null)
  const [justCopied, setJustCopied] = useState(false)
  const rawInputRef = useRef<HTMLTextAreaElement>(null)
  const tsvFallbackRef = useRef<HTMLTextAreaElement>(null)
  const pasteHintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const copiedFlashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const onScroll = () => setNavCollapsed(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Flip the copy button itself to a "copied" state instead of relying on
  // the status line below it — that text doesn't visibly change on a
  // second tap if the message happens to read the same, so it's easy to
  // miss. Setting this from the click itself (not an effect watching
  // copyStatus) means the timer always restarts cleanly on repeat taps.
  const handleCopyClick = async () => {
    const ok = await copyAllForSheets(tsvFallbackRef.current)
    if (ok) {
      clearTimeout(copiedFlashTimer.current)
      setJustCopied(true)
      copiedFlashTimer.current = setTimeout(() => setJustCopied(false), 1800)
    }
  }

  const hasResults = rows.length > 0
  const primaryDisabled = !rawText.trim()

  const handlePrimaryAction = () => {
    if (mode === 'auto') runAutoParse()
    else startManualCut()
  }

  const handlePaste = async () => {
    const el = rawInputRef.current
    if (!el) return
    const result = await pasteIntoRawText(el)
    if (result === 'fallback') {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
      clearTimeout(pasteHintTimer.current)
      setPasteHint('เปิดคีย์บอร์ดแล้ว — แตะในช่องข้อความอีกครั้งให้ปุ่ม "วาง" ขึ้น (หรือแตะค้างแล้วเลือก "วาง" จากเมนู)')
      pasteHintTimer.current = setTimeout(() => setPasteHint(null), 6000)
    }
  }

  const firstColLabel = menuFirst ? 'Menu' : 'Name'
  const secondColLabel = menuFirst ? 'Name' : 'Menu'

  return (
    <div className="min-h-dvh bg-background pb-10 text-foreground">
      <header className="sticky top-0 z-20 border-b-[0.5px] border-border bg-background/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex min-h-11 max-w-xl items-center gap-2 px-4 md:max-w-2xl lg:max-w-3xl">
          <span
            className={cn(
              'flex flex-none items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all',
              navCollapsed ? 'size-6' : 'size-7.5',
            )}
            aria-hidden
          >
            <MessageSquareText className={navCollapsed ? 'size-3.5' : 'size-4.5'} strokeWidth={2.25} />
          </span>
          <span
            className={cn(
              'flex-1 text-[17px] font-semibold transition-all',
              navCollapsed ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
            )}
          >
            LINE Order Extractor
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={theme === 'light' ? 'สลับเป็นโหมดมืด' : 'สลับเป็นโหมดสว่าง'}
            onClick={toggleTheme}
          >
            {theme === 'light' ? <Moon /> : <Sun />}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 pt-1 pb-3 md:max-w-2xl lg:max-w-3xl">
        <h1 className="text-[30px] font-bold tracking-tight">LINE Order Extractor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          แปะข้อความจาก LINE → แก้ไข → คัดลอกไปวางใน Google Sheets ทีเดียว
        </p>
      </div>

      <main className="mx-auto max-w-xl px-4 pb-4 md:max-w-2xl lg:max-w-3xl">
        {/* Step 1: paste */}
        <section className="mb-6 rounded-3xl border border-border/60 bg-background p-3.5">
          <StepHeader n={1} label="แปะข้อความ" />

          <div className="mb-2.5 flex gap-0.5 rounded-lg bg-muted p-0.5">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-[13.5px] font-semibold transition-colors',
                  mode === m ? 'bg-card shadow-sm' : 'text-muted-foreground',
                )}
              >
                {m === 'auto' ? 'อัตโนมัติ' : 'แมนนวล'}
              </button>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-card shadow-[inset_0_0_0_0.5px_var(--border)]">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 z-10 rounded-full shadow-sm"
              aria-label="วางจากคลิปบอร์ด"
              onClick={handlePaste}
            >
              <ClipboardPaste />
            </Button>
            <AutoGrowTextarea
              ref={rawInputRef}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="วางข้อความทั้งหมดจาก LINE ตรงนี้..."
              rows={8}
              className="min-h-[160px] w-full border-0 bg-transparent px-3.5 py-3 pr-12 text-base outline-none placeholder:text-muted-foreground"
            />
          </div>
          {pasteHint && <p className="mt-2 ml-1 text-[13px] text-muted-foreground">{pasteHint}</p>}

          {mode === 'manual' && (
            <p className="mt-2 ml-1 text-[13px] text-muted-foreground">
              แตะ "เริ่มตัดข้อความ" แล้วใช้ปุ่ม ◀ ▶ เลื่อนตำแหน่งตัดทีละคำ จากนั้นแตะ "ตัดไปเป็น..." เพื่อส่งข้อความที่ไฮไลต์ไปเป็นค่า
              สีฟ้า = กำลังตัด NAME, สีเขียว = กำลังตัด MENU สลับกันไปเรื่อยๆ จนครบ
            </p>
          )}

          <div className="mt-3.5 flex items-center gap-2.5">
            <Button
              type="button"
              disabled={primaryDisabled}
              className="h-11 flex-1 rounded-full px-5"
              onClick={handlePrimaryAction}
            >
              {mode === 'auto' ? <List /> : <Scissors />}
              {mode === 'auto' ? 'แยกรายการ' : 'เริ่มตัดข้อความ'}
            </Button>
            <Button type="button" variant="ghost" className="h-11 text-destructive" onClick={requestClear}>
              <RotateCcw />
              ล้างทั้งหมด
            </Button>
          </div>

          {mode === 'manual' && manualState.active && (
            <ManualCutter
              manualState={manualState}
              canUndo={canUndo}
              onNav={manualNav}
              onCut={manualCut}
              onUndo={manualUndo}
              onQuickCut={manualQuickCut}
            />
          )}
        </section>

        {/* Step 2: review */}
        {hasResults && (
          <section className="mb-6 rounded-3xl border border-border/60 bg-background p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <StepHeader n={2} label="ตรวจสอบ / แก้ไข" />
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted-foreground">{rows.length} แถว</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[12.5px] text-destructive"
                  aria-label="ล้างรายการที่แยกไว้ (ข้อความที่วางไว้จะไม่หาย)"
                  title="ล้างรายการที่แยกไว้ — ข้อความที่วางไว้ด้านบนจะไม่หาย"
                  onClick={clearRows}
                >
                  <X />
                  ล้างรายการ
                </Button>
              </div>
            </div>
            <p className="mx-1 mb-3 text-[13px] text-muted-foreground">
              แถวสีเหลือง = ดูน่าจะไม่ใช่รายการอาหาร (เช่น หัวข้อ, หมายเหตุ) ตรวจสอบแล้วใช้ปุ่มลบ หรือปุ่มรวมแถวด้านล่างการ์ดเพื่อแก้ไข
            </p>

            <div className="sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
              {rows.map((row, index) => (
                <OrderRowCard
                  key={row.id}
                  row={row}
                  isFirst={index === 0}
                  isLast={index === rows.length - 1}
                  onChange={(field, value) => updateRow(row.id, field, value)}
                  onDelete={() => deleteRow(row.id)}
                  onMergeUp={() => mergeRow(row.id, 'up')}
                  onMergeDown={() => mergeRow(row.id, 'down')}
                />
              ))}
            </div>

            <Button type="button" variant="ghost" className="mt-1" onClick={addRow}>
              <Plus />
              เพิ่มแถว
            </Button>
          </section>
        )}

        {/* Step 3: copy */}
        {hasResults && (
          <section className="mb-6 rounded-3xl border border-border/60 bg-background p-3.5">
            <StepHeader n={3} label="คัดลอกไปวาง" />
            <p className="mx-1 mb-3 text-[13px] text-muted-foreground">
              แตะปุ่มด้านล่าง แล้วไปแตะเลือก "เซลล์คอลัมน์ {firstColLabel} แถวแรก" ใน Google Sheets แล้ววาง (Paste) ครั้งเดียว
              ระบบจะกระจายข้อมูลลงทุกแถว/คอลัมน์ให้อัตโนมัติ
            </p>

            <div className="mb-3 flex flex-col gap-2.5 rounded-2xl bg-card px-3.5 py-2.5 shadow-[inset_0_0_0_0.5px_var(--border)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] text-muted-foreground">
                  ตัวอย่างที่จะคัดลอก — คอลัมน์แรก: <span className="font-semibold text-foreground">{firstColLabel}</span>
                </span>
                <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={toggleColumnOrder}>
                  <ArrowLeftRight />
                  สลับคอลัมน์
                </Button>
              </div>
              <label className="flex items-center justify-between gap-2 border-t-[0.5px] border-border pt-2.5">
                <span>
                  <span className="block text-[13px] font-medium text-foreground">QTY (จำนวนคน)</span>
                  <span className="block text-[12px] text-muted-foreground">
                    นับจาก "+" ในชื่อ เช่น "กุ๊กไก่ + สม" = 2 คน — เพิ่มเป็นคอลัมน์ที่ 3
                  </span>
                </span>
                <Switch checked={qtyEnabled} onCheckedChange={toggleQty} />
              </label>
            </div>

            <div className="mb-4 max-h-72 overflow-y-auto rounded-2xl bg-card shadow-[inset_0_0_0_0.5px_var(--border)]">
              <table className="w-full border-collapse text-left text-[13.5px]">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr>
                    <th className="border-b-[0.5px] border-border px-3 py-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                      {firstColLabel}
                    </th>
                    <th className="border-b-[0.5px] border-border px-3 py-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                      {secondColLabel}
                    </th>
                    {qtyEnabled && (
                      <th className="border-b-[0.5px] border-border px-3 py-2 text-center text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                        Qty
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const name = sanitizeForSheets(row.name)
                    const menu = sanitizeForSheets(row.menu)
                    const [first, second] = menuFirst ? [menu, name] : [name, menu]
                    return (
                      <tr key={row.id} className="border-b-[0.5px] border-border last:border-b-0">
                        <td className="px-3 py-2 align-top break-words">{first || '—'}</td>
                        <td className="px-3 py-2 align-top break-words font-medium">{second || '—'}</td>
                        {qtyEnabled && (
                          <td className="px-3 py-2 text-center align-top font-medium tabular-nums">
                            {countQty(name)}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <Button
              type="button"
              className={cn(
                'h-13 w-full rounded-full text-base transition-colors duration-200',
                justCopied && 'bg-success hover:bg-success',
              )}
              onClick={handleCopyClick}
            >
              {justCopied ? <Check /> : <Clipboard />}
              {justCopied ? 'คัดลอกแล้ว!' : 'คัดลอกสำหรับ Google Sheets'}
            </Button>
            {copyStatus?.tone === 'err' && (
              <p className="mt-2.5 ml-1 text-[13.5px] text-destructive">{copyStatus.message}</p>
            )}
            <details className="mx-1 mt-3.5 text-[13px] text-muted-foreground">
              <summary className="cursor-pointer">ถ้าคัดลอกอัตโนมัติไม่ได้ (คัดลอกด้วยตนเอง)</summary>
              <textarea
                ref={tsvFallbackRef}
                readOnly
                rows={6}
                value={buildTsv()}
                className="mt-2 w-full rounded-lg border border-input bg-transparent p-2.5 text-[13px]"
              />
            </details>
          </section>
        )}
      </main>

      <ClearConfirmDrawer open={clearDrawerOpen} onOpenChange={(o) => (o ? null : cancelClear())} onConfirm={confirmClear} />
    </div>
  )
}
