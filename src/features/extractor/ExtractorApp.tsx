import { useEffect, useRef, useState } from 'react'
import {
  Clipboard,
  ClipboardPaste,
  List,
  Plus,
  RotateCcw,
  Scissors,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSystemTheme } from '@/hooks/use-system-theme'
import { AutoGrowTextarea } from './AutoGrowTextarea'
import { ClearConfirmDrawer } from './ClearConfirmDrawer'
import { ManualCutter } from './ManualCutter'
import { OrderRowCard } from './OrderRowCard'
import { useExtractor } from './useExtractor'

export function ExtractorApp() {
  useSystemTheme()

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
    updateRow,
    deleteRow,
    mergeRow,
    buildTsv,
    copyAllForSheets,
    pasteIntoRawText,
  } = api

  const [navCollapsed, setNavCollapsed] = useState(false)
  const [pasteHint, setPasteHint] = useState<string | null>(null)
  const rawInputRef = useRef<HTMLTextAreaElement>(null)
  const tsvFallbackRef = useRef<HTMLTextAreaElement>(null)
  const pasteHintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const onScroll = () => setNavCollapsed(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  return (
    <div className="min-h-dvh bg-background pb-10 text-foreground">
      <header className="sticky top-0 z-20 border-b-[0.5px] border-border bg-background/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex min-h-11 max-w-xl items-center gap-2 px-4">
          <span
            className={cn(
              'flex-none rounded-lg bg-primary transition-all',
              navCollapsed ? 'size-6' : 'size-7.5',
            )}
            aria-hidden
          />
          <span
            className={cn(
              'text-[17px] font-semibold transition-all',
              navCollapsed ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
            )}
          >
            LINE Order Extractor
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 pt-1 pb-3">
        <h1 className="text-[30px] font-bold tracking-tight">LINE Order Extractor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          แปะข้อความจาก LINE → แก้ไข → คัดลอกไปวางใน Google Sheets ทีเดียว
        </p>
      </div>

      <main className="mx-auto max-w-xl px-4 pb-4">
        {/* Step 1: paste */}
        <section className="mb-6">
          <p className="mb-2 ml-1 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
            ขั้นตอนที่ 1 · แปะข้อความ
          </p>

          <div className="mb-2.5 flex gap-0.5 rounded-lg bg-muted p-0.5">
            {(['auto', 'manual'] as const).map((m) => (
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
          <section className="mb-6">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="ml-1 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
                ขั้นตอนที่ 2 · ตรวจสอบ / แก้ไข
              </p>
              <span className="text-[13px] text-muted-foreground">{rows.length} แถว</span>
            </div>
            <p className="mx-1 mb-3 text-[13px] text-muted-foreground">
              แถวสีเหลือง = ดูน่าจะไม่ใช่รายการอาหาร (เช่น หัวข้อ, หมายเหตุ) ตรวจสอบแล้วใช้ปุ่มลบ หรือปุ่มรวมแถวด้านล่างการ์ดเพื่อแก้ไข
            </p>

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

            <Button type="button" variant="ghost" className="mt-1" onClick={addRow}>
              <Plus />
              เพิ่มแถว
            </Button>
          </section>
        )}

        {/* Step 3: copy */}
        {hasResults && (
          <section className="mb-6">
            <p className="mb-2 ml-1 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
              ขั้นตอนที่ 3 · คัดลอกไปวาง
            </p>
            <p className="mx-1 mb-3 text-[13px] text-muted-foreground">
              แตะปุ่มด้านล่าง แล้วไปแตะเลือก "เซลล์คอลัมน์ Name แถวแรก" ใน Google Sheets แล้ววาง (Paste) ครั้งเดียว
              ระบบจะกระจายข้อมูลลงทุกแถว/คอลัมน์ให้อัตโนมัติ
            </p>
            <Button
              type="button"
              className="h-13 w-full rounded-full text-base"
              onClick={() => copyAllForSheets(tsvFallbackRef.current)}
            >
              <Clipboard />
              คัดลอกสำหรับ Google Sheets
            </Button>
            {copyStatus && (
              <p
                className={cn(
                  'mt-2.5 ml-1 text-[13.5px]',
                  copyStatus.tone === 'ok' ? 'text-success' : 'text-destructive',
                )}
              >
                {copyStatus.message}
              </p>
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

      <footer className="px-4 py-4 text-center text-xs text-muted-foreground">
        <p>ทำงานทั้งหมดในเบราว์เซอร์ ไม่มีการส่งข้อมูลออกไปที่ใด</p>
      </footer>

      <ClearConfirmDrawer open={clearDrawerOpen} onOpenChange={(o) => (o ? null : cancelClear())} onConfirm={confirmClear} />
    </div>
  )
}
