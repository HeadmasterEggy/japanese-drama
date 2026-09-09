"use client"

import { useMemo } from "react"
import { isPunctuationToken, tokenizeRomaji } from "@/lib/romaji"
import { useHighlight } from "@/components/WordHighlight"

/**
 * The romaji under a line, rendered as words rather than as one string.
 *
 * Each word knows which segments of the Japanese it transliterates, so hovering
 * it lights the kanji or katakana above — and hovering those lights it back.
 * See components/WordHighlight for the pairing.
 */
export default function RomajiLine({ text }: { text: string }) {
  const tokens = useMemo(() => tokenizeRomaji(text), [text])
  const { active, activateGroup, clear, enabled } = useHighlight()

  return (
    <>
      {tokens.map((token, i) => {
        const lit =
          active !== null && token.segments.some((s) => active.includes(s))

        return (
          <span key={i}>
            {/*
              The separator sits outside the hover target on purpose: a space
              that lights up reads as part of the word next to it.
            */}
            {i > 0 && !isPunctuationToken(token.romaji) ? " " : ""}
            <span
              className={lit ? "rj-word is-lit" : "rj-word"}
              onMouseEnter={enabled ? () => activateGroup(token.segments) : undefined}
              onMouseLeave={enabled ? clear : undefined}
            >
              {token.romaji}
            </span>
          </span>
        )
      })}
    </>
  )
}
