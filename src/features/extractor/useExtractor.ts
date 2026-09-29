import { useCallback, useRef, useState } from 'react'
import { copyValue, insertAtCursor } from './clipboard'
import {
  charAdvance,
  charRetreat,
  countQty,
  parseText,
  sanitizeForSheets,
  tokenAdvance,
  tokenRetreat,
} from './textParsing'
import { INITIAL_MANUAL_STATE, type Mode, type OrderRow } from './types'

interface HistoryEntry {
  prevText: string
  prevPos: number
  prevBuildingName: string
  prevHasName: boolean
  completedRowId: number | null
}

export type CopyStatus = { tone: 'ok' | 'err'; message: string } | null

export function useExtractor() {
  const nextId = useRef(1)

  const [rawText, setRawText] = useState('')
  const [rows, setRows] = useState<OrderRow[]>([])
  const [mode, setModeState] = useState<Mode>('manual')
  const [manualState, setManualState] = useState(INITIAL_MANUAL_STATE)
  const historyRef = useRef<HistoryEntry[]>([])
  const [historyLength, setHistoryLength] = useState(0)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null)
  const [clearDrawerOpen, setClearDrawerOpen] = useState(false)

  // Optional 3rd column: headcount, derived from counting "+"-separated
  // names (e.g. "กุ๊กไก่ + สม" -> 2). Always appended last, after Menu/Name.
  const [qtyEnabled, setQtyEnabled] = useState(true)
  const toggleQty = useCallback(() => setQtyEnabled((v) => !v), [])

  // Some destination sheets have a merged-cell header spanning several
  // columns per field (e.g. "Menu" merged across 5 columns before "Name"
  // starts) — with no merge info in plain-text TSV, matching that layout
  // means padding each field's value with (span - 1) blank cells so the
  // next field's value lands under the right column.
  const [columnSpans, setColumnSpans] = useState({ menu: 5, name: 4, qty: 1 })
  const setColumnSpan = useCallback((field: 'menu' | 'name' | 'qty', span: number) => {
    const clamped = Math.max(1, Math.min(50, Math.round(span) || 1))
    setColumnSpans((prev) => ({ ...prev, [field]: clamped }))
  }, [])

  const makeId = () => nextId.current++

  const setMode = useCallback((next: Mode) => setModeState(next), [])

  const runAutoParse = useCallback(() => {
    if (!rawText.trim()) return
    const drafts = parseText(rawText)
    setRows(drafts.map((d) => ({ ...d, id: makeId() })))
    setCopyStatus(null)
  }, [rawText])

  const resetManualState = useCallback(() => {
    setManualState(INITIAL_MANUAL_STATE)
    historyRef.current = []
    setHistoryLength(0)
  }, [])

  const performClear = useCallback(() => {
    setRawText('')
    setRows([])
    resetManualState()
    setCopyStatus(null)
  }, [resetManualState])

  const requestClear = useCallback(() => setClearDrawerOpen(true), [])
  const cancelClear = useCallback(() => setClearDrawerOpen(false), [])
  const confirmClear = useCallback(() => {
    setClearDrawerOpen(false)
    performClear()
  }, [performClear])

  const addRow = useCallback(() => {
    const id = makeId()
    setRows((prev) => [...prev, { id, name: '', menu: '', flagged: false }])
  }, [])

  // Clears just the parsed rows (e.g. after parsing with the wrong mode by
  // mistake) without touching the pasted text — a single click, no
  // confirmation, since the text is still there to re-parse.
  const clearRows = useCallback(() => {
    setRows([])
    setCopyStatus(null)
  }, [])

  const updateRow = useCallback((id: number, field: 'name' | 'menu', value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }, [])

  const deleteRow = useCallback((id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }, [])

  // Folds the row after `id` (mergeDown) or before it (mergeUp) into `id`,
  // appending the other row's name+menu as extra menu text.
  const mergeRow = useCallback((id: number, direction: 'up' | 'down') => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id)
      if (idx === -1) return prev
      const targetIdx = direction === 'up' ? idx - 1 : idx
      const sourceIdx = direction === 'up' ? idx : idx + 1
      if (targetIdx < 0 || sourceIdx >= prev.length) return prev

      const target = prev[targetIdx]
      const source = prev[sourceIdx]
      const extra = [source.name, source.menu].filter(Boolean).join(' ')
      const merged: OrderRow = {
        ...target,
        menu: [target.menu, extra].filter(Boolean).join(' '),
        flagged: false,
      }
      const next = prev.slice()
      next.splice(sourceIdx, 1)
      next[targetIdx] = merged
      return next
    })
  }, [])

  const padded = (value: string, span: number) => [value, ...Array(span - 1).fill('')]

  const buildTsv = useCallback(
    () =>
      rows
        .map((r) => {
          const name = sanitizeForSheets(r.name)
          const menu = sanitizeForSheets(r.menu)
          const cols = [...padded(menu, columnSpans.menu), ...padded(name, columnSpans.name)]
          if (qtyEnabled) cols.push(...padded(String(countQty(name)), columnSpans.qty))
          return cols.join('\t')
        })
        .join('\n'),
    [rows, qtyEnabled, columnSpans],
  )

  const copyAllForSheets = useCallback(
    async (fallbackEl: HTMLTextAreaElement | null) => {
      const tsv = buildTsv()
      const ok = await copyValue(tsv, fallbackEl)
      setCopyStatus(
        ok
          ? {
              tone: 'ok',
              message: `คัดลอกแล้ว (${rows.length} แถว) — ไปแตะเซลล์ Menu แถวแรกใน Google Sheets แล้ววางได้เลย`,
            }
          : { tone: 'err', message: 'คัดลอกอัตโนมัติไม่สำเร็จ กรุณาใช้กล่องคัดลอกด้วยตนเองด้านล่าง' },
      )
      return ok
    },
    [buildTsv, rows.length],
  )

  // ---- Manual mode ----

  const startManualCut = useCallback(() => {
    const text = rawText.trim()
    if (!text) return
    setManualState({ active: true, text, pos: 0, buildingName: '', hasName: false })
    historyRef.current = []
    setHistoryLength(0)
  }, [rawText])

  const manualNav = useCallback((kind: 'charBack' | 'charForward' | 'wordBack' | 'wordForward') => {
    setManualState((prev) => {
      const fn =
        kind === 'charBack'
          ? charRetreat
          : kind === 'charForward'
            ? charAdvance
            : kind === 'wordBack'
              ? tokenRetreat
              : tokenAdvance
      return { ...prev, pos: fn(prev.text, prev.pos) }
    })
  }, [])

  // NOTE: this deliberately reads `manualState` from the closure instead of
  // using the setManualState(prev => ...) functional-updater form. It needs
  // to conditionally call setRows and push to historyRef as side effects,
  // and React (in StrictMode) invokes updater functions twice to verify
  // they're pure — nesting those side effects inside one double-fires them
  // (e.g. the same row gets appended twice). Reading current state directly
  // and calling setRows/setManualState as separate top-level calls avoids that.
  const manualCut = useCallback(
    (kind: 'assign' | 'discard') => {
      if (manualState.pos === 0) return
      const cutValue = manualState.text.slice(0, manualState.pos).trim()
      const rest = manualState.text.slice(manualState.pos)

      const entry: HistoryEntry = {
        prevText: manualState.text,
        prevPos: manualState.pos,
        prevBuildingName: manualState.buildingName,
        prevHasName: manualState.hasName,
        completedRowId: null,
      }

      let next = { ...manualState, text: rest, pos: 0 }

      if (kind === 'assign') {
        if (!manualState.hasName) {
          next = { ...next, buildingName: cutValue, hasName: true }
        } else {
          const id = makeId()
          setRows((rs) => [...rs, { id, name: manualState.buildingName, menu: cutValue, flagged: false }])
          entry.completedRowId = id
          next = { ...next, buildingName: '', hasName: false }
        }
      }

      historyRef.current.push(entry)
      setHistoryLength(historyRef.current.length)
      setManualState(next)
    },
    [manualState],
  )

  const manualUndo = useCallback(() => {
    const entry = historyRef.current.pop()
    setHistoryLength(historyRef.current.length)
    if (!entry) return
    if (entry.completedRowId !== null) {
      setRows((prev) => prev.filter((r) => r.id !== entry.completedRowId))
    }
    setManualState({
      active: true,
      text: entry.prevText,
      pos: entry.prevPos,
      buildingName: entry.prevBuildingName,
      hasName: entry.prevHasName,
    })
  }, [])

  // Quick Cut: for when the NAME/MENU card flow doesn't fit what the user is
  // doing right now — grab exactly the highlighted text and hand it back so
  // the caller can copy it straight to the clipboard, dropping it from the
  // pool without building a card.
  const manualQuickCut = useCallback((): string | null => {
    if (manualState.pos === 0) return null
    const cutValue = manualState.text.slice(0, manualState.pos).trim()
    const rest = manualState.text.slice(manualState.pos)
    historyRef.current.push({
      prevText: manualState.text,
      prevPos: manualState.pos,
      prevBuildingName: manualState.buildingName,
      prevHasName: manualState.hasName,
      completedRowId: null,
    })
    setHistoryLength(historyRef.current.length)
    setManualState({ ...manualState, text: rest, pos: 0 })
    return cutValue
  }, [manualState])

  const pasteIntoRawText = useCallback(
    async (el: HTMLTextAreaElement): Promise<'inserted' | 'fallback'> => {
      try {
        const text = await navigator.clipboard.readText()
        if (text) {
          setRawText(insertAtCursor(el, text))
          return 'inserted'
        }
      } catch {
        // Clipboard API blocked or unsupported (common on mobile Safari) —
        // caller falls back to focusing the field for the user to paste.
      }
      return 'fallback'
    },
    [],
  )

  return {
    rawText,
    setRawText,
    rows,
    mode,
    setMode,
    manualState,
    canUndo: historyLength > 0,
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
    resetManualState,
    addRow,
    clearRows,
    updateRow,
    deleteRow,
    mergeRow,
    buildTsv,
    copyAllForSheets,
    pasteIntoRawText,
    qtyEnabled,
    toggleQty,
    columnSpans,
    setColumnSpan,
  }
}

export type ExtractorApi = ReturnType<typeof useExtractor>
