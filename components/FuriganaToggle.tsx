"use client"

import { useAnnotations, type FuriganaMode } from "@/components/AnnotationProvider"

/**
 * Cycles how furigana readings show: always → hover → off.
 *
 * Furigana was the one annotation with no control, while romaji and the
 * katakana gloss both had a first-class button — and it is the one a learner
 * most wants to take away, because a reading sitting over the kanji answers the
 * question before they have tried to.
 *
 * The state is spelled out rather than left to colour alone. Three states told
 * apart by shade would be a guess every time.
 */
const LABELS: Record<FuriganaMode, { suffix: string; title: string }> = {
  always: { suffix: "常", title: "振假名：一直显示 · 点击改为悬停显示" },
  hover: { suffix: "悬", title: "振假名：悬停在词上才显示（可以自测）· 点击改为隐藏" },
  off: { suffix: "隐", title: "振假名：隐藏 · 点击改为一直显示" },
}

export default function FuriganaToggle({
  activeColor = "#f59e0b",
  idleBackground = "#261508",
  idleColor = "#a07850",
  idleBorder = "#5c3010",
}: {
  activeColor?: string
  idleBackground?: string
  idleColor?: string
  idleBorder?: string
}) {
  const { furigana, cycleFurigana } = useAnnotations()
  const { suffix, title } = LABELS[furigana]

  // `always` is the loud state; `hover` is on but holding back, so it reads as
  // an outline; `off` matches the other toggles' idle look.
  const style =
    furigana === "always"
      ? { background: activeColor, color: "#1a0c02", borderColor: activeColor, fontWeight: 600 }
      : furigana === "hover"
        ? { background: "transparent", color: activeColor, borderColor: activeColor, fontWeight: 500 }
        : { background: idleBackground, color: idleColor, borderColor: idleBorder, fontWeight: 400 }

  return (
    <button
      onClick={cycleFurigana}
      className="text-xs px-3 py-1 rounded-lg border transition-all whitespace-nowrap"
      style={style}
      title={title}
      aria-label={title}
    >
      ふり·{suffix}
    </button>
  )
}
