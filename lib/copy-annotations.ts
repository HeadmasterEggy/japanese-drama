/**
 * Keeping the annotation layers out of what gets copied.
 *
 * Both layers are rendered into the text flow rather than beside it (see
 * components/JapaneseText.tsx for why), so the browser's own copy treats them
 * as part of the sentence. Two things then go wrong at once:
 *
 *   - `<rt>` is emitted BEFORE its base, so each reading lands in front of the
 *     kanji it belongs to.
 *   - `rt` and `.rb` are `display: block`, so every annotated word becomes its
 *     own line in the copied text.
 *
 * Selecting 「よし、準備(じゅんび)はいい？」 produced
 * "よし、\nじゅんび\n準備\nはいい？" — unusable in a dictionary, a flashcard
 * deck, or a note, which is most of what a learner does with a sentence.
 */

/** The annotation layers themselves: furigana readings, katakana source words. */
const ANNOTATION_SELECTOR = "rt, .kt-en"

/**
 * Wrappers that mark a selection as containing annotated Japanese.
 *
 * Deliberately not ANNOTATION_SELECTOR: a browser that honours the
 * `user-select: none` in globals.css may drop the readings from the cloned
 * fragment on its own, and the block-level line breaks would still need
 * fixing. The wrappers are always selectable, so they are the reliable signal.
 */
const ANNOTATED_SELECTOR = "ruby, .kt"

/**
 * The sentence behind a selection, with both annotation layers stripped.
 *
 * `textContent` is what removes the line breaks: it concatenates text nodes
 * without regard for the block boxes the annotation layout is built from.
 *
 * Returns null when the selection holds no annotated Japanese — the signal to
 * leave the browser's own copy alone rather than rewriting a plain-text copy
 * somewhere else in the app.
 */
export function plainTextFromSelection(selection: Selection): string | null {
  if (selection.isCollapsed || selection.rangeCount === 0) return null

  let sawAnnotated = false
  let out = ""

  // Every range, not just the first: Firefox produces multi-range selections
  // from ctrl+click, and dropping the rest would silently truncate the copy.
  for (let i = 0; i < selection.rangeCount; i++) {
    const fragment = selection.getRangeAt(i).cloneContents()
    if (fragment.querySelector(ANNOTATED_SELECTOR)) sawAnnotated = true
    fragment
      .querySelectorAll(ANNOTATION_SELECTOR)
      .forEach((node) => node.remove())
    out += fragment.textContent ?? ""
  }

  return sawAnnotated && out ? out : null
}
