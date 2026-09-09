"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { tokenizeRomaji } from "@/lib/romaji"

/**
 * Pairs a line of Japanese with its romaji, so hovering either one lights up
 * the other.
 *
 * The romaji line used to be a flat string with no relation to the text above
 * it, which left a learner to work out for themselves which run of letters went
 * with which word — the one thing the line exists to tell them.
 *
 * A scope covers one message. Two messages on screen highlight independently,
 * and a `JapaneseText` rendered outside any scope (the coach panel, the podcast
 * transcript — neither shows romaji) gets the inert default and does no work.
 */
type HighlightValue = {
  /** Segment indices currently lit, or null. Indexes `parseJapaneseText(text)`. */
  active: number[] | null
  /** Light the whole romaji word that this segment belongs to. */
  activateSegment: (segment: number) => void
  /** Light a romaji word's segments directly. */
  activateGroup: (segments: number[]) => void
  clear: () => void
  /** False outside a scope, so consumers can skip attaching handlers. */
  enabled: boolean
}

const INERT: HighlightValue = {
  active: null,
  activateSegment: () => {},
  activateGroup: () => {},
  clear: () => {},
  enabled: false,
}

const HighlightContext = createContext<HighlightValue>(INERT)

export function useHighlight() {
  return useContext(HighlightContext)
}

export function HighlightScope({
  text,
  children,
}: {
  text: string
  children: React.ReactNode
}) {
  const [active, setActive] = useState<number[] | null>(null)

  /*
   * segment index -> every segment the romaji word covering it was built from.
   *
   * Hovering 食 in 食(た)べ物(もの) has to light 物 as well, because the two
   * rubies are one word ("tabemono") and lighting half of it would be a lie
   * about where the word ends.
   */
  const groups = useMemo(() => {
    const map = new Map<number, number[]>()
    for (const token of tokenizeRomaji(text)) {
      for (const segment of token.segments) map.set(segment, token.segments)
    }
    return map
  }, [text])

  const activateSegment = useCallback(
    (segment: number) => setActive(groups.get(segment) ?? [segment]),
    [groups]
  )
  const activateGroup = useCallback((segments: number[]) => setActive(segments), [])
  const clear = useCallback(() => setActive(null), [])

  const value = useMemo(
    () => ({ active, activateSegment, activateGroup, clear, enabled: true }),
    [active, activateSegment, activateGroup, clear]
  )

  return (
    <HighlightContext.Provider value={value}>{children}</HighlightContext.Provider>
  )
}
