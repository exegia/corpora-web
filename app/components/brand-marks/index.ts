/**
 * Provider marks in their own brand colours.
 *
 * `@remixicon`'s provider glyphs are single `currentColor` paths, which cannot
 * render Google's four-colour G at all — that is why these are hand-held SVGs
 * rather than a `text-*` class over the icon font.
 *
 * Google keeps its literal palette, which its brand guidelines require and
 * which reads on either theme. Apple and GitHub are monochrome brands, so they
 * stay `currentColor` and inherit the row's foreground — flipping correctly in
 * dark mode, which a hard-coded #181717 would not.
 */

import { default as Mark } from "./mark"

export const Brand = {
    Mark,
}
