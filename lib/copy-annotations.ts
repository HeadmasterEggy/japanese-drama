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
 * Elements that end a line.
 *
 * The annotation layout is built entirely from `display: block` spans inside an
 * inline-block, which is exactly what was breaking the sentence apart — so this
 * cannot ask what an element's computed display is (a cloned fragment is
 * detached and has none anyway). It goes by tag instead: these are the
 * structural elements the app lays messages out with, and every annotation
 * wrapper is a span, a ruby or an rt.
 *
 * Without this, a selection covering a whole bubble ran the speaker's name, the
 * sentence and the romaji together with nothing between them, and a selection
 * across several messages ran the whole conversation into one line.
 */
const BLOCK_TAGS = new Set(["DIV", "P", "BR", "LI", "TR", "SECTION", "ARTICLE"])

/** Text of one node, skipping annotations and ending a line after each block. */
function serialize(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? ""
  if (node.nodeType !== Node.ELEMENT_NODE) return ""

  const element = node as Element
  if (element.matches(ANNOTATION_SELECTOR)) return ""

  let out = ""
  for (const child of element.childNodes) out += serialize(child)
  return BLOCK_TAGS.has(element.tagName) ? `${out}\n` : out
}

/**
 * The sentence behind a selection, with both annotation layers stripped.
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
    for (const child of fragment.childNodes) out += serialize(child)
  }

  // A bubble nests several blocks, so its closing tags stack up newlines that
  // were never blank lines on screen.
  const text = out.replace(/\n{2,}/g, "\n").trim()

  return sawAnnotated && text ? text : null
}
