import type { OrderRow } from './types'

// A line made only of separator/decoration characters (----, ====, ****, ...)
// is treated the same as a blank line: it splits blocks but never becomes
// its own row.
const SEPARATOR_LINE = /^[-=_*~•·.\s]{3,}$/

type DraftRow = Omit<OrderRow, 'id'>

// QTY = headcount for the order: names are written as "A + B + C" for a
// shared order, so the count of "+"-separated (non-empty) parts is the
// number of people on that row. A name with no "+" is just one person.
export function countQty(name: string): number {
  const parts = name
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean)
  return parts.length || 1
}

/**
 * Parses a raw pasted LINE message into Name/Menu rows.
 *
 * Blocks are runs of non-blank lines separated by blank lines (one or more)
 * or a separator line. Most of the time a block is already exactly one
 * [name, menu] pair. But LINE sometimes strips the blank line between orders
 * entirely, so a whole day's messages can arrive as one giant block — in
 * that case the lines are still just name/menu alternating in sequence, so
 * they get paired two at a time instead of dumped into a single menu field.
 */
export function parseText(text: string): DraftRow[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: string[][] = []
  let current: string[] = []

  const flush = () => {
    if (current.length > 0) {
      blocks.push(current)
      current = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === '' || SEPARATOR_LINE.test(line)) {
      flush()
    } else {
      current.push(line)
    }
  }
  flush()

  return blocks.flatMap(explodeBlock)
}

function explodeBlock(block: string[]): DraftRow[] {
  if (block.length <= 1) {
    return [{ name: block[0] || '', menu: '', flagged: true }]
  }
  if (block.length % 2 === 0) {
    return pairUp(block)
  }
  // Odd-length block (>2 lines): almost always a stray note/header line
  // (e.g. "ปิด 18:40 น.") sitting in front of otherwise-paired entries.
  // Peel it off as its own flagged row so the rest still pairs correctly.
  const [first, ...rest] = block
  return [{ name: first, menu: '', flagged: true }, ...pairUp(rest)]
}

function pairUp(lines: string[]): DraftRow[] {
  const rows: DraftRow[] = []
  for (let i = 0; i < lines.length; i += 2) {
    rows.push({ name: lines[i] || '', menu: lines[i + 1] || '', flagged: false })
  }
  return rows
}

// A "token" is a whitespace-delimited run. Advancing always lands at the
// start of the next token, consuming the token under the cursor plus the
// whitespace/newline gap after it — so a cut at that position naturally
// ends right before the next word, with no leftover whitespace to trim.
export function tokenAdvance(text: string, pos: number): number {
  let i = pos
  const n = text.length
  while (i < n && !/\s/.test(text[i])) i++
  while (i < n && /\s/.test(text[i])) i++
  return i
}

export function tokenRetreat(text: string, pos: number): number {
  let i = pos
  while (i > 0 && /\s/.test(text[i - 1])) i--
  while (i > 0 && !/\s/.test(text[i - 1])) i--
  return i
}

// Single-character nudges, for lining the cursor up mid-word when a whole
// token is too coarse a step (e.g. cutting off trailing punctuation that has
// no space before it).
export function charAdvance(text: string, pos: number): number {
  return Math.min(pos + 1, text.length)
}

export function charRetreat(_text: string, pos: number): number {
  return Math.max(pos - 1, 0)
}
