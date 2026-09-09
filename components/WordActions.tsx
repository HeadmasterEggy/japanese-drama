"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

/**
 * Clicking a word: hear it, or ask the coach about it.
 *
 * The hover pairing added in WordHighlight made a word an addressable thing;
 * this gives it something to do. Both actions existed already but only at whole
 * message granularity — 🔊 read the entire line, and asking about one word meant
 * typing `@教练 「重心」是什么意思` by hand, which is enough friction that nobody
 * does it mid-conversation.
 *
 * Click rather than hover, deliberately. It is the one annotation interaction
 * that works on a touch screen, where the pairing highlight cannot.
 */
export type OpenWord = {
  /** The word as written, e.g. 重心 or スノーボード. */
  word: string
  /** Furigana reading, when the word had one. */
  reading?: string
  /** Source word behind a katakana loanword, when known. */
  gloss?: string
  /** The line the word sits in, so the coach can answer in context. */
  sentence: string
  /** Where to anchor the card. */
  anchor: { left: number; top: number; bottom: number }
}

type WordActionsValue = {
  open: (word: OpenWord) => void
  /** True inside a provider, so consumers can skip attaching handlers. */
  enabled: boolean
}

const WordActionsContext = createContext<WordActionsValue>({
  open: () => {},
  enabled: false,
})

export function useWordActions() {
  return useContext(WordActionsContext)
}

/** Speak one word with the browser's own Japanese voice. */
function speakWord(word: string, reading?: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return
  window.speechSynthesis.cancel()

  // The reading when there is one: a speech engine handed 重心 has to guess the
  // reading, and じゅうしん removes the guess. This is also why the local voice
  // is used rather than the AI one — a single word should be instant and free,
  // and the pronunciation is already known.
  const utterance = new SpeechSynthesisUtterance(reading || word)
  utterance.lang = "ja-JP"
  utterance.rate = 0.8
  const voice = window.speechSynthesis
    .getVoices()
    .find((v) => v.lang.startsWith("ja"))
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
}

export function WordActionsProvider({
  askCoach,
  coachBusy = false,
  children,
}: {
  /** Absent outside a scene, where there is no coach to ask. */
  askCoach?: (question: string) => void
  /** The coach is already answering; a second question would be dropped. */
  coachBusy?: boolean
  children: React.ReactNode
}) {
  const [word, setWord] = useState<OpenWord | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const open = useCallback((next: OpenWord) => setWord(next), [])
  const close = useCallback(() => setWord(null), [])

  // Dismiss on anything that would leave the card pointing at nothing: a click
  // outside it, Escape, or a scroll that moves the word out from under it.
  // Repositioning on scroll was not worth it — the card is a glance, not a
  // panel, and a stale card is worse than one that got out of the way.
  useEffect(() => {
    if (!word) return

    function onPointerDown(event: MouseEvent) {
      if (!cardRef.current?.contains(event.target as Node)) close()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close()
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [word, close])

  // Stop any speech when the card goes away, so a word cannot keep talking
  // after its card is gone.
  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  const value = useMemo(() => ({ open, enabled: true }), [open])

  return (
    <WordActionsContext.Provider value={value}>
      <div data-word-actions="on" className="contents">
        {children}
      </div>
      {word && (
        <WordCard
          ref={cardRef}
          word={word}
          askCoach={askCoach}
          coachBusy={coachBusy}
          onClose={close}
        />
      )}
    </WordActionsContext.Provider>
  )
}

/** Card size, used to keep it inside the viewport. Height is the tallest form:
 *  reading + word + gloss + the button row. */
const CARD_WIDTH = 200
const CARD_MAX_HEIGHT = 116
const GAP = 8

function WordCard({
  ref,
  word,
  askCoach,
  coachBusy,
  onClose,
}: {
  ref: React.Ref<HTMLDivElement>
  word: OpenWord
  askCoach?: (question: string) => void
  coachBusy: boolean
  onClose: () => void
}) {
  const { anchor } = word

  // Above the word by default, flipped below when the card would not fit there.
  //
  // Either way it stops short of the word's own line, so the word stays visible
  // in its sentence while the card is open — an anchored card of this size will
  // always cover *some* neighbouring line, and covering the line you just
  // clicked in would be the one placement that makes it useless.
  const flipsBelow = anchor.top - GAP - CARD_MAX_HEIGHT < 0
  const left = Math.min(
    Math.max(GAP, anchor.left - CARD_WIDTH / 2),
    (typeof window === "undefined" ? 1024 : window.innerWidth) - CARD_WIDTH - GAP
  )

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`「${word.word}」`}
      className="fixed z-50 rounded-xl px-3 py-2.5 shadow-xl"
      style={{
        left,
        [flipsBelow ? "top" : "bottom"]: flipsBelow
          ? anchor.bottom + GAP
          : (typeof window === "undefined" ? 768 : window.innerHeight) - anchor.top + GAP,
        width: CARD_WIDTH,
        background: "#2d1508",
        border: "1px solid #7c4b14",
        color: "#f0d5a0",
      }}
    >
      {word.reading && (
        <div className="text-xs" style={{ color: "#f59e0b" }}>{word.reading}</div>
      )}
      <div className="text-base font-semibold leading-tight">{word.word}</div>
      {word.gloss && (
        <div className="text-xs mt-0.5" style={{ color: "#5eead4" }}>{word.gloss}</div>
      )}

      <div className="flex gap-1.5 mt-2">
        <button
          onClick={() => speakWord(word.word, word.reading)}
          className="flex-1 text-xs px-2 py-1 rounded-lg transition-all"
          style={{ background: "#3d2010", color: "#f0d5a0", border: "1px solid #5c3010" }}
          title="朗读这个词"
        >
          🔊 朗读
        </button>
        {askCoach && (
          // Disabled rather than silently dropped while the coach is answering:
          // the question would go nowhere, and a card that closes on click reads
          // as success.
          <button
            onClick={() => {
              askCoach(
                `「${word.word}」在「${word.sentence}」这句话里是什么意思？怎么读？`
              )
              onClose()
            }}
            disabled={coachBusy}
            className="flex-1 text-xs px-2 py-1 rounded-lg transition-all"
            style={
              coachBusy
                ? { background: "#1a1020", color: "#374d6a", border: "1px solid #1e2030", cursor: "not-allowed" }
                : { background: "#1e3050", color: "#93c5fd", border: "1px solid #2563eb" }
            }
            title={coachBusy ? "教练正在回答上一个问题" : "让教练解释这个词"}
          >
            问教练
          </button>
        )}
      </div>
    </div>
  )
}

export { speakWord }
