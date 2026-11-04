# Visual Design System: KrisKompassen

This document defines the visual design system for KrisKompassen. It establishes the shared visual rules, design tokens, component patterns, and accessibility requirements for all frontend user interfaces in the application.

KrisKompassen is a public crisis-information Progressive Web App (PWA) designed for the general public in Sweden. The primary goal during emergencies and public disruptions is to deliver clear, trustworthy, and actionable information (*What happened? What should I do? Where should I go?*) with low cognitive load.

Clarity, readability, accessibility, and resilience under stressful conditions take strict precedence over decorative trends or extraneous visual effects.

---

## 1. Core Principles

1. **Calm and Trustworthy Authority**
   Emergencies cause stress and anxiety. The visual presentation must feel composed, official, and reassuring. Deep blue conveys stability and trust, paired with a soft light-blue content canvas and crisp white content cards. The header, desktop navigation and opened mobile menu use white surfaces; the fixed mobile menu field uses the yellow brand accent.

2. **Low Cognitive Load and High Legibility**
   Users in crisis situations may be stressed, distracted, or visually impaired. Visual hierarchy must be immediate. Headings, body copy, and interactive controls must have distinct weights, generous line heights, and restrained typography.

3. **Accessibility as a First Principle (WCAG 2.2 AA Baseline)**
   Every interactive element, text passage, and visual indicator must satisfy WCAG 2.2 AA criteria. KrisKompassen adopts a strict internal standard of **48×48 CSS pixels** for interactive targets—intentionally exceeding the WCAG 2.2 AA baseline (24×24 CSS pixels) to enhance usability on touch devices, for older adults, and for users operating under high stress. Keyboard focus outlines must be unmistakable, and colour must never be the sole carrier of meaning.

4. **Zero Font Overhead for Resilient Rendering**
   The typography relies on a clean, modern system font stack. Avoiding external font dependencies eliminates third-party network requests and supports resilient rendering in offline or degraded network conditions without font asset download bottlenecks or missing glyphs.

5. **Restrained Brand Accents and Functional Animation**
   Brand accent yellow/amber (`amber-400`) is used in moderation as a decorative brand accent within the signature crisis-information bar. It must not by itself communicate warning severity or urgency. VMA warnings use the dedicated semantic palette defined in section 2.4.1. Animations are minimal and functional (150ms transitions), avoiding motion sickness and unnecessary distraction.

---

## 2. Colour System

KrisKompassen uses a tailored palette combining deep brand blue, a calm light-blue content canvas, crisp white surfaces, neutral slate typography, and semantic status tones.

### 2.1 Logo-Derived Brand Palette

The visual identity of KrisKompassen is anchored in the application logo:

> "The Kriskompassen identity originates from the logo's dark navy, light blue and warm yellow palette. Application colours may use adjusted shades or tints where needed for accessibility, contrast and comfortable reading, while remaining visually related to the source brand colours."

Representative colours derived from the logo artwork include:

| Role | Approximate Hex | Description |
| --- | --- | --- |
| **Brand Navy** | `#093158` | Deep navy foundational brand tone from the compass housing. |
| **Brand Light Blue** | `#8DD7FB` | Vibrant light blue from the compass dial face. |
| **Brand Yellow** | `#FBCC54` | Warm yellow accent from the compass needle and indicator markings. |

*Note on tonal variation:* The logo asset contains natural gradients, shading, and tonal variations; the hex codes above serve as representative source reference colours rather than static UI fill values.

### 2.2 Adapted Application UI Palette

To ensure accessible contrast ratios, eliminate visual glare, and provide comfortable reading across diverse environments, the web application adapts the logo's source tones into calibrated UI tokens:

- **UI Primary Blue (`#1E3A8A` / `blue-900`):** An adapted deep blue providing strong contrast (>= 4.5:1) for headings, text links, buttons, and focus indicators against white surfaces.
- **Page Canvas (`#D7E2EF`):** A softened, muted tint of the brand light blue that provides a restful background canvas behind content cards and page content without causing eye strain.
- **UI Accent Amber (`#FBBF24` / `amber-400`):** A warm yellow brand accent used in the signature crisis-information bar and, as the softer `amber-300` tint, the full-width fixed mobile menu field (with dark blue text, icon and top border).
- **Surface White (`#FFFFFF` / `bg-white`):** Crisp white content cards, header, desktop navigation and opened mobile menu surfaces for clear text presentation.

| Token / Name | Hex / Value | Tailwind Class | Usage |
| --- | --- | --- | --- |
| **UI Primary Blue** | `#1E3A8A` | `bg-blue-900`, `text-blue-900`, `border-blue-900` | Primary brand colour, headings, primary buttons, active navigation, focus rings. |
| **UI Dark Blue** | `#172554` | `hover:bg-blue-950` | Primary button hover/active state. |
| **UI Blue Medium** | `#1E40AF` | `bg-blue-800` | Accent bar hover state, interactive highlights. |
| **UI Blue Border** | `rgb(191 219 254 / 0.8)` | `border-blue-200/80` | Subtle card borders against white surfaces. |
| **UI Blue Hover** | `#60A5FA` | `hover:border-blue-400` | Card border hover state. |
| **UI Light Tint** | `#EFF6FF` | `hover:bg-blue-50` | Secondary/outline button hover background. |
| **Page Canvas Background** | `#D7E2EF` | `bg-[#D7E2EF]` | Main application content canvas behind cards and page content. Soft, calming light blue. Header, desktop navigation and opened mobile menu surfaces remain white. |
| **Surface White** | `#FFFFFF` | `bg-white` | Content cards, header surface, desktop navigation, opened mobile menu, panels. |
| **UI Accent Amber** | `#FBBF24` | `bg-amber-400` | Restrained decorative brand accent used in the signature crisis-information bar. Must not by itself communicate warning severity or urgency. |

### 2.3 Neutral and Typography Palette

| Token / Name | Hex / Value | Tailwind Class | Usage |
| --- | --- | --- | --- |
| **Text Primary (Canvas)** | `#1e293b` | `text-slate-800` | Base text on the light blue page background canvas. |
| **Text Headings** | `#1e3a8a` | `text-blue-900` | H1, H2, and card titles on white surfaces. |
| **Text Body** | `#334155` | `text-slate-700` | Body copy, detail descriptions, instructional copy. |
| **Text Secondary** | `#475569` | `text-slate-600` | Card summaries, taglines, source attribution, timestamps. |
| **Border Neutral** | `#e2e8f0` | `border-slate-200` | Navigation borders, section dividers, metadata separators. |
| **Background Neutral Hover** | `#f1f5f9` | `hover:bg-slate-100` | Inactive navigation item hover background. |

### 2.4 Semantic and Status Palette

| State | Text Class | Background / Border | Meaning & Usage |
| --- | --- | --- | --- |
| **Success / Saved** | `text-green-800` (`#166534`) | `border-green-800` | Confirmation messages (e.g. offline save confirmed). Must pair with an explicit text label and checkmark (`✓`). |
| **Error / Alert** | `text-red-800` (`#991b1b`) | `border-red-800` | Error messages, storage failure, failed network requests. Must pair with clear instructional copy. VMA request status follows section 2.4.1 to distinguish a failed check from an active warning. |
| **Status Pending / Busy** | `text-slate-700` | `opacity-60` | Loading indicators, storage read/write in progress (`…`). |

#### Rule on Warnings and Urgency
`amber-400` is a brand accent, not a semantic warning colour. It must never be used alone to indicate severity, hazard, or urgency. Warning indicators, including the VMA banner, follow these rules:
- Warning styling must be defined separately as dedicated semantic tokens.
- Warnings must combine clear visual contrast with explicit text labels and unambiguous iconography.
- Information must never rely on colour alone.

#### 2.4.1 Active VMA Warning

`VmaBanner` uses a dark red surface and white foreground to distinguish an active public warning from ordinary application content. These semantic aliases are defined centrally with `@theme inline` in `frontend/src/index.css`; components use the aliases rather than hard-coded palette colours.

| Semantic Token | Palette Value | Usage |
| --- | --- | --- |
| `--color-vma-surface` | `var(--color-red-900)` | `bg-vma-surface`: the banner and its sticky VMA label. |
| `--color-vma-foreground` | `var(--color-white)` | `text-vma-foreground`: text, warning icon, source link and retry control. |
| `--color-vma-border` | `var(--color-red-950)` | `border-vma-border`: a decorative bottom edge, not a control or severity indicator. |
| `--color-vma-focus` | `var(--color-white)` | The 3px focus outline for the warning region and its controls. |

- **Meaning:** Red/white styling and the warning triangle appear only when an active VMA message is displayed. They do not encode different severity levels.
- **Icon and label:** A 24×24 CSS pixel inline SVG triangle with an exclamation mark sits beside **"VMA · Viktigt meddelande"**, with an 8px gap. Its 2px rounded stroke uses `currentColor`. The icon does not shrink or require a downloaded asset. It is redundant with the visible label, so it has `aria-hidden="true"` and `focusable="false"` and creates no extra screen-reader announcement or keyboard stop.
- **Text and layout:** The bold heading is 18px, rising to 20px at `sm`. Titles wrap without truncation. The icon and VMA label remain visible while the banner scrolls internally, with the same opaque warning background. The outer banner stays above the header, is limited to 40dvh and remains keyboard-scrollable.
- **Full message:** The heading contains an underlined button with `aria-haspopup="dialog"`,
  a pointer cursor, a minimum 48×48px target and the white warning focus outline. Source/retry controls remain
  separate; the warning surface itself is not a nested click target.
- **Multiple messages:** With more than one active message, a semibold count (**"3 aktiva VMA"**)
  sits below the VMA label, and the newest headline gains a 14px metadata line with its area names
  and **Utfärdat**/**Uppdaterat** time, because CAP titles are often the same generic VMA label. A
  disclosure button (**"Visa 2 fler VMA"** / **"Dölj fler VMA"**) reuses the compact retry-button
  style in its own block, so the source link always starts on a new line. It is collapsed by
  default and controls a list of the other messages in display order, each a bold, underlined,
  48×48px title button with its own metadata line. The list scrolls within the 40dvh banner. No
  separators or extra colours are introduced. With one message, none of these elements appear.
- **Links and controls:** Source attribution stays underlined. The compact retry button uses inherited foreground colour, a 1px `border-current`, `rounded-md`, a 14px semibold label and `disabled:opacity-70`. Links and buttons retain at least 48×48 CSS pixel targets. This warning-surface variant preserves legibility without introducing a second button background.
- **Focus and contrast:** White text, icon strokes, enabled control borders and focus outlines against the installed Tailwind `red-900` value (`oklch(0.396 0.141 25.723)`) have approximately **10.06:1** contrast. The banner's own outline is inset by 4px to remain visible at the viewport edge; control outlines use the standard 4px outward offset. Forced colours use the system `Highlight` outline and allow the icon to inherit the system foreground. Recheck contrast when changing these tokens.
- **Request states:** Without an active message, loading, unavailable information (no successful check yet), possibly outdated information (stale or failed check, with the last successful check time) and incomplete information use `bg-slate-100 text-slate-900 border-slate-300` with explicit status text and no warning triangle. A successful empty result hides the banner. A failed check never claims that no VMA exists. If a still-active message is retained after a failed check, its warning styling stays visible alongside the possibly-outdated notice and last successful check time.

### 2.5 Contrast Targets and Verification

- **Required Minimum Targets (WCAG 2.2 AA):**
  - **Normal text (< 18pt or < 14pt bold):** Target minimum contrast ratio of **4.5:1** against its background.
  - **Large text (>= 18pt / 24px regular or >= 14pt / 18.5px bold):** Target minimum contrast ratio of **3.0:1**.
  - **User interface components and graphical boundaries:** Target minimum contrast ratio of **3.0:1** against adjacent background colours.
  - **Focus indicators:** Target minimum contrast ratio of **3.0:1** against adjacent backgrounds.
- **Verification Requirement:**
  Contrast ratios must not be assumed. Every implemented foreground/background pair must be explicitly verified with an accessibility contrast checker whenever new visual combinations or component states are created.
- **Non-Reliance on Colour Alone:**
  Never use colour as the only visual cue to convey state, urgency, error, or confirmation. Always combine colour with explicit text labels, semantic icons (`✓`, `○`), underlines, or font weight differences.

---

## 3. Typography

KrisKompassen uses a fast, resilient system font stack with a clear type scale designed for legibility and comfortable reading under stress.

### 3.1 Typeface Stack

```css
font-family:
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  "Helvetica Neue",
  Arial,
  sans-serif;
```

**Rationale:** Relying on the host platform's native sans-serif font stack avoids external font dependencies, reduces bundle size, eliminates layout shifts (FOIT/FOUT), and supports resilient rendering in offline or degraded network conditions without font asset download bottlenecks.

### 3.2 Type Hierarchy and Scale

| Role | HTML Element | Tailwind Classes | Size / Leading | Weight | Purpose |
| --- | --- | --- | --- | --- | --- |
| **App Title** | `p` (in header) | `text-2xl sm:text-3xl font-bold tracking-tight text-blue-900` | 24px / 30px | Bold (700) | Application branding in the header. |
| **Page Heading** | `h1` (`#page-heading`) | `text-3xl font-bold text-blue-900` | 30px / 36px | Bold (700) | Primary title on every routed page. Accessible target for route focus. |
| **Section / Card Heading** | `h2` | `text-xl font-bold text-blue-900` | 20px / 28px | Bold (700) | Crisis item title in list cards. |
| **Lead Paragraph** | `p` | `text-lg leading-relaxed text-slate-700 max-w-prose` | 18px / 28px | Regular (400) | Introductory description on the home page or section overviews. |
| **Body Text** | `p`, `article` | `text-base leading-relaxed text-slate-700 max-w-prose` | 16px / 26px | Regular (400) | Primary descriptive content, detail card body, explanations. |
| **Summary / Card Excerpt** | `p` | `text-base leading-relaxed text-slate-600` | 16px / 26px | Regular (400) | Short summary text in cards before opening detail view. |
| **Metadata / Attribution** | `p`, `span` | `text-sm text-slate-600` (sources: `font-medium`) | 14px / 20px | Regular / Medium | Source attributions, timestamps, secondary status lines. |
| **Button / Link Label** | `button`, `a` | `text-base font-semibold` | 16px / 24px | Semibold (600) | Interactive button and link labels. |

### 3.3 Text Measure and Swedish Word Breaking

- **Line Length Constraints:**
  Reading long lines on wide viewports increases cognitive fatigue. Long-form copy must use `max-w-prose` (constrained to approximately 65–75 characters per line).
- **Swedish Compound Words:**
  Swedish frequently combines words into long compound nouns (e.g. *Krisinformation*, *Samhällsstörningar*, *Inrymningsmeddelande*). Headings, navigation links, and article titles must include the `wrap-anywhere` utility class to prevent overflow on narrow screens without breaking layout integrity.

---

## 4. Spacing, Sizing, and Grid Layout

KrisKompassen uses an 8pt / 4px base spacing grid consistent with Tailwind CSS conventions.

### 4.1 Spacing Scale

| Spacing Token | Pixels / Rem | Typical Usage |
| --- | --- | --- |
| `gap-2` / `py-2` | 8px / 0.5rem | Tight element spacing, navigation gap. |
| `gap-3` / `py-3` | 12px / 0.75rem | Button vertical padding, status message gaps. |
| `px-4` / `gap-4` | 16px / 1.0rem | Standard mobile edge padding, body text margin (`mt-4`). |
| `px-5` | 20px / 1.25rem | Button horizontal padding. |
| `p-6` / `gap-6` | 24px / 1.5rem | Card internal padding (mobile), card grid gaps (`gap-6`), section margins (`mt-6`). |
| `sm:p-8` / `pt-8` | 32px / 2.0rem | Card internal padding (desktop/tablet), main content top padding (`pt-8 sm:pt-10`). |

### 4.2 Page Shell and Layout Boundaries

- **Max Width Container:**
  All main content sections, header content, and navigation links are constrained to `max-w-4xl` (`56rem` / 896px) and horizontally centered with `mx-auto`.
- **Canvas and Surfaces:**
  `#D7E2EF` acts as the main application content canvas behind cards and page content. The header, desktop navigation and opened mobile menu use clean white surfaces; the fixed mobile menu field uses `amber-300`.
- **Viewport Safe-Area Insets:**
  Modern mobile screens with rounded corners, notches, and home indicator bars require safe-area handling:
  - Header: `pt-[env(safe-area-inset-top)]`
  - Root container: `pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]`
  - Fixed mobile footer: its full-width button owns the padding, using `pb-[max(0.75rem,env(safe-area-inset-bottom))]`, `pl-[max(1rem,env(safe-area-inset-left))]` and `pr-[max(1rem,env(safe-area-inset-right))]`. This keeps the yellow field clickable through its padding. The full-screen menu pads all four edges with the matching insets.
- **Dynamic Content Offset:**
  When the mobile menu bar is fixed at the bottom of the viewport (below `48rem`), the root element tracks its measured height as `--navigation-height` via `ResizeObserver`. The shared page footer (section 6.8), the last element in the layout, is followed by an `aria-hidden` spacer of that height:
  `h-[var(--navigation-height,0px)]`
  This reserves sufficient scroll space so no content is obscured behind the bar, including its safe-area padding and enlarged text. It is `0px` from `48rem` upwards, where the bar is hidden. `main` itself uses a plain `pb-8`.
  From `48rem`, the layout also tracks the sticky desktop navigation's measured height as `--sticky-navigation-height` (`0px` while it is not sticky, so always below `48rem`). The root scroll padding, the sticky app-update slot and the focused-content check add it below the VMA height, so anchors, route headings and focused controls are revealed below the pinned bar. Focus within the bar itself never scrolls the page.

### 4.3 Responsive Content Grids

- **Crisis List Grid:**
  - Mobile (< 640px): 1 column (`grid gap-6`).
  - Tablet & Desktop (>= 640px): 2 equal columns (`grid gap-6 sm:auto-rows-fr sm:grid-cols-2`).
- **Cards Equal Height:**
  Article cards use `h-full flex flex-col` and, from `sm`, the grid uses `sm:auto-rows-fr`,
  giving every card the same height across all rows. The tallest card determines the height at
  the current width and text size; retain full headings and summaries without fixed pixel
  heights or clipping. The single-column mobile layout keeps each card at its natural height.
- **Enlarged text in article cards:** Cap horizontal padding at its default size: 24px below
  `sm`, 28px on list cards from `sm`, and 32px on article detail from `sm`. Use `min()` with the
  corresponding rem spacing as the normal maximum. List footers and detail content use flexible
  grid gutters around a `minmax(min-content, 1fr)` column. When enlarged whole button words
  need more space, both gutters shrink to a minimum of 8px instead of letting the controls overflow
  their row. This includes layouts narrowed by classic scrollbars and preserves the full 3px/4px
  focus outline. Normal-size spacing stays unchanged; vertical spacing keeps scaling.

### 4.4 Stacking Layers

| Layer | z-index | Element |
| --- | --- | --- |
| Top layer | — | Native modal dialogs (Meny, VMA message, confirmations) |
| Skip link | 50 | Focused "Hoppa till huvudinnehållet" |
| VMA notice | 30 | Sticky at the viewport top |
| Desktop navigation | 20 | Sticky below the VMA notice from `48rem` |
| App update | 10 | Sticky below the navigation at heights ≥ `40rem` |
| Mobile footer | 5 | Fixed at the bottom below `48rem` |

Page content uses no z-index. Local overlays (map hints, popovers) stay within their own stacking context or below 20.

---

## 5. Surfaces, Borders, and Elevation

### 5.1 Content Cards and Panels

Content cards represent units of crisis information. They are clean, distinct surfaces floating on top of the `#D7E2EF` light blue main content canvas. The header, desktop navigation and opened mobile menu use white surfaces; the fixed mobile menu field uses `amber-300`.

- **Background:** Crisp solid white (`bg-white`).
- **Border Radius:** `rounded-2xl` (16px / 1.0rem) with `overflow-hidden`.
- **Border:** `border border-blue-200/80` at rest.
- **Hover State:** `hover:border-blue-400` with `transition-[border-color,box-shadow] duration-150 ease-out`.
- **Shadow:** Subtle resting shadow (`shadow-sm` = `0 1px 2px 0 rgb(0 0 0 / 0.05)`). Interactive cards elevate slightly on hover to `shadow-md`.
- **Avoid Heavy Elevation:** Deep, dark, or multi-layered drop shadows are deliberately avoided to keep visual noise low and prevent perceived clutter.

### 5.2 The Signature Crisis Indicator Bar

The signature top accent bar applies specifically to **crisis-information cards (`CrisisCard`) and crisis-detail surfaces (`DetailedCrisisCard`)**, not to every generic card, panel, empty state, or settings container in the application. Other uses are the white content cards of the static "Lugn i kris" page (section 5.4), the home page hero and feature cards (section 5.5) and the krisinfo overview cards (section 5.8):

```html
<div className="flex h-1.5 w-full" aria-hidden="true">
  <span className="h-full flex-1 bg-blue-900 transition-colors group-hover:bg-blue-800" />
  <span className="h-full w-8 bg-amber-400" />
</div>
```

- **Height:** 6px (`h-1.5`).
- **Segments:**
  - A primary solid deep blue bar (`flex-1 bg-blue-900`) representing stability and official authority.
  - A warm yellow/amber end block (`w-8 bg-amber-400`) providing a restrained brand accent. It is decorative and does not denote warning level, severity, or urgency.
- **Accessibility:** Marked with `aria-hidden="true"` as it is a decorative brand motif.

### 5.3 Category Icons

Crisis-information overview cards (`CrisisCard`) and the emergency-kit category accordions (`CrisisKitPage`) show one icon beside the heading to aid scanning. Crisis-detail surfaces do not.

- **Source:** The dependency-free inline SVG component `CrisisIcon`; no icon library or downloaded asset. Names are chosen by `iconForArticleId()` and `iconForKitCategory()` in `utils/crisisIcons.ts`, so the same concept uses the same icon on both surfaces. Unknown or future article IDs use the generic `other` icon.
- **Style:** One outline style for all icons: 24×24 viewBox, `fill="none"`, 1.8 stroke, round caps and joins, `stroke="currentColor"`.
- **Colour:** `text-blue-900` only. No per-category colours, and no amber on icons; the amber accent bar stays the only amber element.
- **Size and layout:** 24px (`size-6`, `shrink-0`), 12px gap (`gap-3`) before the heading. The heading keeps `min-w-0 flex-1` and wraps without truncation, so enlarged text and zoom reflow normally. The icon aligns to the first heading line on cards (`items-start`) and is centred in the accordion summary.
- **Accessibility:** The icon only repeats the visible heading, so it is `aria-hidden="true"` and `focusable="false"`, has no `<title>` and creates no second accessible name. It sits outside the heading element, is not interactive and does not change the card link or summary focus behaviour.

| Concept | Icon | Article ID | Kit category |
| --- | --- | --- | --- |
| Food | utensils | `food-in-crisis` | Mat |
| Drinking water | water drop | `drinking-water-in-crisis` | Dricksvatten |
| Hygiene | soap | `hygiene-in-crisis` | Toalett och hygien |
| Heat | flame | `heating-in-crisis` | Värme |
| Communication | radio | `communication-in-crisis` | Kommunikation |
| Medicine | pill | `medication-in-crisis` | Läkemedel |
| Payments | payment card | none | Betalningar |
| Pets | paw | none | Husdjur |
| Other / unknown | generic box | any other ID | Övrigt |

### 5.4 Calm Page Motif and Panels ("Lugn i kris")

The static `/lugn-i-kris` page uses a few decorative elements. They add no new colours, gradients or animation. It is a part of the krisinfo overview (section 5.8), and its back link (section 7.3) sits above the hero card, 24px from the card's top edge.

- **Signature bar:** the hero, advice and sources cards carry the same blue/amber top bar as section 5.2 (without the hover colour), on an `overflow-hidden` card with padding on an inner element. The emergency panel does not.
- **Hero:** a white content card (section 5.1) with the `h1`, a one-line `p` (`text-xl font-semibold text-blue-900`) and the lead paragraph. `CalmHeroMotif` sits beside the text from `sm`. On mobile it sits directly below the text with a tight `gap-3` and is smaller (`size-20`, `sm:size-40`) to keep the hero compact.
- **Hero motif:** an inline SVG of two light rings (`text-blue-200`), one darker inner ring with a gentle wave (`text-blue-900`) and one small amber dot (`text-amber-400`). Keep it to three rings so it reads as stillness, not a target. It is `aria-hidden`, `focusable="false"`, titleless and not animated.
- **Emergency panel:** `rounded-2xl border-2 border-blue-900 bg-blue-50` with an `h2` label ("Vid akut fara") and plain text. It uses no red and no warning triangle, which stay reserved for VMA (section 2.4.1). The visible label, not colour, carries the meaning. It contains no link or control.
- **Advice cards:** section 5.1 cards. Each `h2` is preceded by a `CalmIcon` (same 24×24, 1.8 stroke, `currentColor` style as section 5.3, `text-blue-900`, `aria-hidden`) in a 48px `rounded-full bg-blue-50` circle. `CalmIcon` is separate from `CrisisIcon`, so the article and kit mapping in section 5.3 is unaffected.
- **Divider:** a decorative row of two thin `bg-blue-900/30` lines around a `size-2` amber dot, placed before the sources section and hidden from assistive technology.
- **Amber:** only the hero dot and the divider dot. Amber stays a small accent and never signals urgency.

### 5.5 Home Page Hero and Feature Overview (proposal)

> **Status: proposal awaiting team approval (section 11.1).** Implemented in `HomePage`. It adds
> no colours, gradients or animation; the hero heading size is a documented exception.

- **Hero:** a white content card (section 5.1) with the section 5.2 accent bar (local to the page).
  The `h1` reads **"Din kompass i en kris"**, so the document title follows it. A
  `text-base sm:text-lg font-semibold text-blue-900` supporting line (**"Förbered dig. Hitta
  rätt. Behåll lugnet."**) and a lead paragraph follow, then two calls to action and a
  non-interactive value row (`text-sm text-slate-600`, wrapping; **✓ Ingen inloggning**, **✓
  Spara viktig information offline**, **✓ Tydliga källor**). The `✓` is a decorative
  `aria-hidden` glyph in `text-blue-900`; the list items are plain text with no background or
  control styling. The `h1` and supporting line are centred below `sm` and, with the lead
  paragraph, calls to action and value row, left-aligned from `sm`; the lead paragraph is always
  left-aligned and the value row is centred below `sm`. From `md` the text sits beside the motif; below `md` only the text and calls to
  action are shown.
- **Hero heading exception:** the home `h1` is `text-3xl sm:text-4xl`. The page-heading rule in
  section 3.2 (`text-3xl`) is unchanged for every other route.
- **Calls to action:** **Se krisinformation** uses the primary button (section 6.2.1) and **Öppna
  min krislåda** the secondary outlined button (section 6.2.2). Both are React Router links. They
  stack at full width below `sm` and sit side by side from `sm`.
- **Hero motif:** `CompassHeroMotif` draws a subtle `text-blue-200` outer ring, a slightly stronger
  `text-blue-300` inner ring, four short `text-blue-900` directional ticks, a two-point needle
  (longer half filled, shorter half outline) anchored by a white hub with a `text-blue-900`
  outline, and one `text-amber-400` dot near the long needle point. It has no lettering or
  gradient, is `aria-hidden`, `focusable="false"`, titleless and not animated, and is hidden below
  `md` (`hidden md:block`).
- **Feature overview:** an `h2` (**"Det här kan du göra i KrisKompassen"**) above four cards whose
  `h3` titles are the shared `navigationItems` labels. Each whole card is one link; its accessible
  name is the title (`aria-labelledby`) and its description is `aria-describedby`.
- **Bento hierarchy:** from `md`, a six-column grid gives every card half a row (`col-span-3`),
  so the four cards form two full rows. Krisinformation and Min krislåda come first, as primary
  cards (larger padding, `text-2xl` title, 56px icon circle with a `border-blue-200` edge on
  `bg-blue-100`); Skyddsrum and Inställningar follow as supporting cards (`text-xl` title, 48px
  `bg-blue-50` icon circle without border). Lugn i kris is reached through the krisinfo
  overview (section 5.8) and has no card here. Every card ends with the same
  decorative cue, pinned to the card bottom: the text **Öppna** and a 20px inline outline arrow
  (section 5.3 style, `currentColor`, `gap-2`), hidden from assistive technology as a whole
  because the link name comes from the title. Below `md` the cards stack in one column. Cards stretch to equal height within a
  row (`h-full`, no fixed heights), so zoom and enlarged text reflow.
- **Card surface:** section 5.1 with the section 5.2 bar including its hover colour; the focus
  outline is drawn inside the clipped card. No transforms.
- **Icons:** the section 5.3 outline style in a `bg-blue-50` circle (as in section 5.4). Min
  krislåda reuses `CrisisIcon` (`other`); Krisinformation, Skyddsrum and Inställningar use
  `HomeFeatureIcon`. All are `aria-hidden` and `text-blue-900`.

### 5.6 Phone Numbers Page (proposal)

> **Status: proposal awaiting team approval (section 11.1).** Implemented in `PhoneNumbersPage`
> and `PhoneCard`. It reuses existing tokens only; adopting it as a recurring pattern requires
> the team's agreement.

- **Emergency number:** the emergency panel from section 5.4 (`rounded-2xl border-2
  border-blue-900 bg-blue-50`), a visible `text-sm font-semibold text-blue-900` label **"Akut
  nödnummer"** above the heading, and the primary button (section 6.2.1). No red, warning
  triangle or amber: red and the triangle stay reserved for VMA (section 2.4.1), and amber is
  never an urgency cue. The label, panel border and button fill set it apart together, so
  colour is never the only cue. The content's `isEmergency` alone selects this variant.
- **Other numbers:** section 5.1 cards without the accent bar or hover state, with the
  secondary button (section 6.2.2). One column at every width, in content order, limited
  together with the sources card to `max-w-2xl` as on the warning signals page (section 5.7).
- **Heading:** each `h2` holds the number (`text-3xl font-bold tabular-nums`, on its own line)
  and the label below it (`text-lg font-semibold`), so heading navigation names the service, not
  only the digits. A space between the two lines keeps the accessible name readable, for example
  "112 Larmnummer vid nöd".
- **Call links:** visible text **"Ring {nummer}"** and a `tel:` link with digits only (a leading
  `+` only for numbers for calls from abroad). The accessible name starts with the visible text:
  **"Ring 112, akut nödnummer"** or **"Ring {nummer}, {etikett}"**. At least 48×48px
  (`min-h-12 min-w-12`) with `wrap-anywhere`.
- **Copyable numbers:** every number is plain text outside its links, so it can be selected and
  copied on devices that cannot place calls. There is no copy button.
- **Numbers for calls from abroad:** below a 1px `border-slate-200` divider, a `text-sm
  text-slate-600` line **"Från utlandet eller utländsk telefon:"** with the number in
  `font-semibold text-slate-800 tabular-nums`, and a secondary-button link **"Ring från
  utlandet"** named **"Ring från utlandet eller med utländsk telefon till {nummer},
  {utlandsnummer}"**.
- **Sources:** a section 5.1 card at the bottom (`KrisinfoSourcesCard`, shared with section
  5.7) with the `h2` **"Källor"**, listing each distinct source once as an `ExternalLink`
  (section 5.7: external-link icon, visually hidden "(öppnas i ny flik)" and, offline,
  "Kräver internetanslutning."), followed by **"Senast kontrollerad: {datum}"** in the metadata
  style (section 3.2). A source used by several posts shows the oldest date among them.
- **Contrast:** calculated with the WCAG 2.2 relative-luminance formula from the installed
  Tailwind 4.3.3 values (`index.css` does not override them), converted from OKLCH to the
  8-bit sRGB colour the browser paints. Each pair meets WCAG AA (4.5:1) for normal text.

  | Foreground | Background | sRGB | Ratio |
  | --- | --- | --- | --- |
  | `blue-900` `oklch(37.9% 0.146 265.522)` | `blue-50` `oklch(97% 0.014 254.604)` | `#1c398e` on `#eff6ff` | 9.53:1 |
  | `slate-700` `oklch(37.2% 0.044 257.287)` | `blue-50` | `#314158` on `#eff6ff` | 9.52:1 |
  | `white` `#fff` | `blue-900` | `#ffffff` on `#1c398e` | 10.37:1 |

  Recalculate these values when the tokens or the Tailwind version change.

### 5.7 Warning Signals Page (proposal)

> **Status: proposal awaiting team approval (section 11.1).** Implemented in
> `WarningSignalsPage`, `SignalCard`, `SignalPattern`, `SignalIcon` and `ExternalLink`. It reuses
> existing tokens only; adopting it as a recurring pattern requires the team's agreement.

- **Heading:** the `h1` and document title are **"Utomhusvarning"**, the name of the page's
  overview card (section 5.8). Directly below it, a one-line `p` (`mt-2 text-lg font-semibold
  text-blue-900 sm:mt-3 sm:text-xl`, as on the calm page in section 5.4) reads **"Hesa Fredrik –
  de fyra varningssignalerna"**, so the familiar name stays visible in every loading state. It is
  not a heading, so the page keeps one `h1`. `#1c398e` on the page background `#d7e2ef`: 7.91:1.
- **Column:** the signal cards and the sources card share one `max-w-2xl` (672px) column in the
  source's order, so on wide screens the text and drawing fill each card instead of leaving an
  empty right-hand area. The `h1` and lead paragraph keep their normal widths. The phone numbers
  page uses the same column (section 5.6).
- **Signal cards:** section 5.1 cards without the accent bar or hover state. Each `h2` is the
  signal's name in `text-2xl font-bold text-blue-900 wrap-anywhere`, one step above the section
  3.2 card heading so it stands clearly above the `h3`. **"Betydelse"** and **"Gör så här"**
  are `h3` (`text-lg font-semibold text-blue-900`), each opening a block with a 1px
  `border-slate-200` top divider (`mt-6 pt-5`). Body text uses the Body Text scale (section
  3.2).
- **Pattern panel:** a `rounded-xl bg-blue-50 p-4` panel below the `h2` groups how the signal
  sounds. Its first row holds `SignalIcon`, a loudspeaker with two sound waves in the section
  5.3 outline style, in a 48px `rounded-full bg-white` circle, beside the pattern description
  (`gap-3`). The timeline follows below at the panel's full width (`mt-4`), so it has room even
  on narrow screens. The panel has no heading of its own. When the content has a recording, the
  panel ends with an `ExternalLink` to it (`mt-2`), labelled **"Lyssna på signalen {namn} hos
  MCF"**, so the accessible name states the signal, MCF and, through the link's hidden text, the
  new tab. It is the card's first link, before the meaning source and the action links.
- **Recording attribution:** one metadata line (section 3.2, `mt-3 max-w-prose text-sm
  text-slate-600`) between the lead paragraph and the cards: **"Ljuden kommer från Myndigheten
  för civilt försvar (MCF)."** followed, outside the sentence, by an `ExternalLink` **"MCF:s sida
  om Hesa Fredrik på mcf.se"** to the section's source page. The sentence stays complete without
  the link. It appears once on the page, not in each card, and the recordings are not listed in
  the sources card.
- **Timeline (`SignalPattern`):** a 4px `fill-blue-300` track with fully rounded ends spans the
  signal's whole duration, with one 10px-high, fully rounded (pill-shaped) `currentColor` stroke
  per tone in `text-blue-900` on top; gaps are the pauses. The SVG has no `viewBox`: positions
  and widths are percentages of the timeline and heights and radii are pixels, so strokes keep
  their shape at every width instead of being stretched. Each signal uses its own time scale,
  from 0 to the duration the content states (or to the end of the last tone when it states
  none), so short and long tones are equally visible and a single continuous tone is one unbroken
  bar. Below the track, `text-sm text-slate-600` labels give the start (**"0 s"**) on the left and
  the end on the right, in whole minutes (**"2 min"**) or else seconds (**"30 s"**), matching
  the text's stated duration. The drawing is the app's own, uses no image files and copies no
  authority's graphics. It is decorative, labels included (`aria-hidden="true"`,
  `focusable="false"`, no `<title>`): the pattern description always states the timing as text.
- **No warning colours:** no red, warning triangle or amber. Red and the triangle stay reserved
  for VMA (section 2.4.1), and amber is never an urgency cue.
- **Meaning:** shown only when the content has one. A separate meaning source follows on a
  metadata line (section 3.2) as **"Källa:"** and an external link.
- **Actions:** an ordered list (`list-decimal`, `text-blue-900` semibold markers). Each step's
  text is always shown; a link, when present, sits below it as a complement. The section is left
  out when the content lists no actions.
- **External links (`ExternalLink`):** used for every external link on the krisinfo pages,
  including their sources. A standalone text link (section 6.3) with `font-medium` and
  `wrap-anywhere`, rendered as an `inline-block` with `py-3` so it keeps a 48px target on one
  line and wraps like ordinary text. A 20×20px decorative external-link icon (box with an
  outgoing arrow, section 5.3 style, `currentColor`, `aria-hidden`) follows the last word and
  stays on the same line as it. A visually hidden **"(öppnas i ny flik)"** completes the
  accessible name, so it starts with the visible text and needs no `aria-label`. While the
  browser reports no connection, a `text-sm text-slate-600` line **"Kräver
  internetanslutning."** follows the link and describes it with `aria-describedby`; the link
  stays available.
- **Loading, error and sources:** as section 5.6: a stable `h1`, a `role="status"` loading
  line, a `role="alert"` error with the secondary **"Försök igen"** button, and the shared
  sources card (`KrisinfoSourcesCard`) at the bottom, listing each source once with its oldest
  check date, including a separate meaning source.
- **Contrast:** calculated as in section 5.6 from the installed Tailwind 4.3.3 values. Each
  text pair meets WCAG AA (4.5:1) for normal text. The drawing is decorative; its strokes still
  exceed the 3:1 non-text target against both the panel and the track. The track is
  deliberately light, so it reads as background behind the strokes, and carries no information.

  | Foreground | Background | sRGB | Ratio | Used for |
  | --- | --- | --- | --- | --- |
  | `blue-900` `oklch(37.9% 0.146 265.522)` | `white` | `#1c398e` on `#ffffff` | 10.37:1 | Headings, links, list markers, icon in its white circle |
  | `slate-700` `oklch(37.2% 0.044 257.287)` | `white` | `#314158` on `#ffffff` | 10.36:1 | Meaning, action text |
  | `slate-600` `oklch(44.6% 0.043 257.281)` | `white` | `#45556c` on `#ffffff` | 7.58:1 | "Källa:" line, "Kräver internetanslutning." |
  | `slate-700` | `blue-50` `oklch(97% 0.014 254.604)` | `#314158` on `#eff6ff` | 9.52:1 | Pattern description in the panel |
  | `slate-600` | `blue-50` | `#45556c` on `#eff6ff` | 6.97:1 | Timeline labels |
  | `blue-900` | `blue-50` | `#1c398e` on `#eff6ff` | 9.53:1 | Tone strokes against the panel |
  | `blue-900` | `blue-300` `oklch(80.9% 0.105 251.813)` | `#1c398e` on `#8ec5ff` | 5.72:1 | Tone strokes against the track |
  | `blue-300` | `blue-50` | `#8ec5ff` on `#eff6ff` | 1.67:1 | Decorative track against the panel |
  | `blue-900` | `blue-50` | `#1c398e` on `#eff6ff` | 9.53:1 | Recording link and its focus outline in the panel |
  | `slate-600` | `blue-50` | `#45556c` on `#eff6ff` | 6.97:1 | "Kräver internetanslutning." below the recording link |
  | `slate-600` | page `#d7e2ef` | `#45556c` on `#d7e2ef` | 5.78:1 | Recording attribution line and its offline note |
  | `blue-900` | page `#d7e2ef` | `#1c398e` on `#d7e2ef` | 7.91:1 | Attribution link, its icon and focus outline |

  Recalculate these values when the tokens or the Tailwind version change.

### 5.8 Krisinfo Overview (proposal)

> **Status: proposal awaiting team approval (section 11.1).** Implemented in
> `KrisinfoOverviewPage` and `KrisinfoSectionCard`, with the parts listed in
> `krisinfoOverviewSections.ts`. It reuses the home page feature card (section 5.5) and adds no
> colours, gradients or animation.

- **Page:** `/krisinformation` with the `h1` **"Krisinformation"** and a lead paragraph
  (`mt-4 max-w-prose text-lg leading-relaxed text-slate-700`), followed by a list named
  **"Delar av krisinformationen"** (`aria-label`), so screen readers announce the number of
  parts. The parts appear in list order: Innan krisen, Telefonnummer, Utomhusvarning, Lugn i kris.
- **Cards:** the section 5.5 supporting card: section 5.1 surface with the section 5.2 bar and its
  hover colour, `p-6`, a 48px `bg-blue-50` icon circle, an `h2` title in `text-xl font-bold
  text-blue-900 wrap-anywhere`, a `text-slate-600` description and the decorative **Öppna** cue
  pinned to the bottom. The whole card is one link named by its title (`aria-labelledby`) and
  described by its text (`aria-describedby`), never by a generic "Läs mer". The focus outline is
  drawn inside the clipped card.
- **Grid:** one column below `md`, two from `md` (`md:grid-cols-2`, `gap-6`); cards stretch to
  equal height within a row.
- **Icons:** section 5.3 style, `aria-hidden`, `text-blue-900`: Innan krisen `HomeFeatureIcon`
  (`info`), Telefonnummer `HomeFeatureIcon` (`phone`, an outline mobile phone), Utomhusvarning
  `SignalIcon`, Lugn i kris `CalmIcon` (`breath`).
- **Contrast** (WCAG 2.2 relative luminance, Tailwind 4.3.3 values as in section 5.6):

  | Foreground | Background | sRGB | Ratio | Used for |
  | --- | --- | --- | --- | --- |
  | `blue-900` | `white` | `#1c398e` on `#ffffff` | 10.37:1 | Card titles, Öppna cue, icons |
  | `slate-600` | `white` | `#45556c` on `#ffffff` | 7.58:1 | Card descriptions |
  | `slate-700` | page background | `#314158` on `#d7e2ef` | 7.90:1 | Lead paragraph |
  | `blue-900` | page background | `#1c398e` on `#d7e2ef` | 7.91:1 | `h1`, back links (section 7.3) and their focus outline |

---

## 6. Interactive Elements and Controls

### 6.1 Touch Target Sizing (48×48px Project Standard)

- **Target Size Standard:**
  KrisKompassen enforces a project-wide design standard of minimum **48×48 CSS pixels** (`min-h-12 min-w-12`) for all clickable buttons, navigation links, and standalone controls.
- **Rationale vs WCAG Baseline:**
  This intentionally exceeds the WCAG 2.2 AA minimum requirement (Level AA SC 2.5.8 requires 24×24 CSS pixels). Exceeding this baseline ensures comfortable target acquisition on touchscreens, accommodates reduced motor precision among older users or cold/trembling hands during emergencies, and minimizes missed taps under high-stress conditions.
- **Isolated Actions:**
  Interactive controls must never be nested inside other interactive controls. In `CrisisCard`, the entire card title/body links to the detail page, but a separate secondary-styled "Läs mer" link (same destination, accessible name `Läs mer om <title>`) and the offline toggle button reside in an isolated, wrapping action row outside the link. "Läs mer" comes first on the left and Save/Remove follows on the right, matching visual and keyboard order. Both controls reserve the longer removal label to prevent movement on saved-state changes, and stack when whole words cannot fit side by side.

### 6.2 Button Variants

#### 6.2.1 Primary Action Button
Used for primary actions (e.g. "Spara offline", "Till startsidan").

- **Classes:**
  `inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-blue-900 text-white font-semibold px-5 py-3 hover:bg-blue-950 active:bg-blue-950 disabled:opacity-60`
- **Border Radius:** `rounded-xl` (12px).
- **States:**
  - Default: solid deep blue background (`#1e3a8a`), white text.
  - Hover: dark blue background (`#172554`).
  - Disabled: `opacity-60` with disabled pointer events.

#### 6.2.2 Secondary / Outlined Button
Used for alternate, non-destructive actions (e.g. "Läs mer", "Visa krisinformation").

- **Classes:**
  `inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-blue-900 bg-white text-blue-900 font-semibold px-5 py-3 hover:bg-blue-50 active:bg-blue-50 disabled:opacity-60`
- **States:**
  - Default: 2px solid deep blue border, white background, deep blue text.
  - Hover: light blue tint background (`#eff6ff`).
  - Disabled: `opacity-60`.

#### 6.2.3 Text Button (tertiary)
Used for secondary actions that should not compete with nearby controls (e.g. "Installera app" in
the header and in the mobile menu footer).

- **Classes:**
  `relative inline-flex min-h-8 cursor-pointer items-baseline gap-2 rounded-xl px-2 py-1.5 text-sm
  font-semibold text-blue-900 underline underline-offset-4 hover:bg-blue-50 active:bg-blue-50
  after:absolute after:inset-x-0 after:-inset-y-2 after:content-['']`
- **Visual:** No border or fill at rest; the underline and blue text mark it as interactive, like
  standalone text links (section 6.3). The `px-2` keeps the focus outline and hover tint clear of
  the label. The label sets the baseline (`items-baseline`), so the button aligns with
  neighbouring text such as the connection status. An optional 20×20px inline SVG icon precedes
  the label, is vertically centred with `self-center`, uses `currentColor`, has
  `aria-hidden="true"` and `focusable="false"`, and never replaces the visible label.
- **Target size:** The visible box is 32px high; the `after` pseudo-element extends the hit area
  by 8px above and below to 48px, keeping the project's 48×48px standard (section 6.1). The
  extended hit area must not overlap other interactive targets, so keep at least 8px between the
  visible box and neighbouring controls.
- **Focus:** The universal focus outline (section 8.1) surrounds the visible box.

#### 6.2.4 Destructive / Outlined Button

Used for removal actions such as deleting an offline article copy, a saved address, a custom
crisis-kit item or a saved shelter. Reuses the existing red outlined treatment; the visible
label explains what is removed.

- **Colours:** `border-2 border-red-800 bg-white text-red-800 hover:bg-red-50`.
- **Offline articles:** `OfflineToggle` uses this variant for **Ta bort offlinekopia** on both
  article cards and the detail page. **Spara offline** stays primary blue and **Läs mer** stays
  secondary blue. Reading comes before the right-hand save/remove action in DOM and visual order;
  a standalone toggle is right-aligned. Both paired controls use an invisible, `aria-hidden`
  **Ta bort offlinekopia** sizing label sharing the visible label's grid cell, preserving equal
  dimensions and wrapping across saved/unsaved/busy states. Use the shelter controls' wrapping
  flex row with `*:min-w-min *:flex-1 *:px-2` and `wrap-normal`, stacking whole controls when
  words cannot fit side by side. Keep the universal focus outline and disabled opacity.
  The saved-state line also reserves **Sparad offline** using an invisible, `aria-hidden` copy
  and equal icon slots; both states keep the same line height even when enlarged text wraps.
- **Contrast:** The installed Tailwind `red-800` text and border have **8.37:1** contrast
  against `white` and **7.67:1** against the `red-50` hover surface, calculated from the
  OKLCH tokens with the WCAG relative-luminance formula. Both exceed the text and UI targets
  in section 2.5; retain the universal blue focus outline.
- **Shelter controls:** Keep `min-h-12 min-w-12`, `rounded-xl`, `px-5 py-3` and the universal
  focus outline. **Visa detaljer** precedes the save/remove button in both DOM and visual order,
  occupying the left side of a wrapping flex row. Both controls reserve the same label and have
  equal widths. **Spara skyddsrum** remains blue and **Ta bort sparat skyddsrum** uses the red
  outlined style, on the right while the row fits.
- **Stable saved/unsaved size:** Both the status and action reserve the longer saved-state
  label in an invisible, `aria-hidden` span sharing the visible label's grid cell. This keeps
  the larger dimensions in both states while adapting to width and enlarged text. The sizing
  text is excluded from accessible names. Map popup controls use the same pattern.
- **Narrow cards / enlarged text:** Use `wrap-normal` for control labels and preserve each
  whole word's intrinsic minimum width. The paired actions use `*:min-w-min *:flex-1 *:px-2`
  and stack when two buttons cannot fit. Standalone save actions use `max-sm:px-2` in narrow
  viewports. Verify that words, targets and focus outlines fit within the card at 320px and
  with enlarged text; do not force word splitting to retain a two-column action row.
- **Standalone controls:** Right-align the save/remove button on the shelter detail page and
  in map popups as well. The status line and any saved-map removal warning keep their reading order.
  **Spara kartbild** uses the same blue primary treatment and sizing label as **Spara skyddsrum**,
  stays on the right, and places its confirmation below so the button does not shift left.
- **Saved addresses:** The current-place status and removal button share a right edge at every
  breakpoint. Action buttons are capped at the card's available width, including with enlarged text.
  For an inactive address, **Ange som aktuell plats** and **Ta bort** fill the same `w-max`
  column with `auto-rows-fr` and `px-2` horizontal padding. Both buttons have equal width and
  height even when labels wrap, with their width determined by the longer label.
  The active address retains its compact standalone removal button.
  Below `sm` in portrait orientation, the paired controls add `my-2` and use `gap-3`.
  Landscape and wider layouts keep their existing margins and `gap-2` spacing.
- **Map popups:** Constrain the popup to the map with a 16px inset, retaining room for focus
  outlines and rounded map edges. Content is a labelled, keyboard-focusable scroll region with
  `p-2` inside the popup's own padding. Maximum height accounts for the popup's padding and tip;
  width is capped at 24rem and the available map width. Resize and movement updates keep the
  popup visible without panning the camera; closing it releases its observers and listener.

### 6.3 Text and Content Links

- **Standalone Text Links:**
  Must have visible underlines by default or clear underlining on focus/hover:
  `inline-block font-medium text-blue-900 underline`
- **Underline Style:**
  Use `underline-offset-4` to ensure descenders (`g`, `y`, `p`, `j`) remain clean and readable.

### 6.4 Skip Link

To support keyboard and screen-reader navigation, a skip link is provided at the very top of `AppLayout`:

- **Visible on Focus:** `focus:fixed focus:inset-x-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-blue-900`
- **Swedish Copy:** *"Hoppa till huvudinnehållet"*
- **Target:** Direct focus shift to `<main id="main-content">` without forced scrolling when already in view.

### 6.5 Switch: "Sparad information" (proposal)

> **Status: proposal awaiting team approval (section 11.1).** Implemented in `ModeToggle` in the
> header. It reuses existing tokens only; adopting it as a recurring pattern requires the team's
> agreement.

- **Structure:** One native `<button type="button" role="switch" aria-checked>` contains the
  visible label on the left and a decorative track (`aria-hidden="true"`) on the right. The label
  is the accessible name; clicking the label or the track toggles the switch, and Space/Enter
  work natively. The whole button is the target: `min-h-12 min-w-12`, `rounded-xl px-2 py-2`,
  `hover:bg-blue-50` and the universal focus outline (section 8.1).
- **Label:** `text-base font-semibold text-blue-900 wrap-anywhere` (Button / Link Label scale).
- **Track:** `h-7 w-12 rounded-full border-2`, off `bg-slate-600 border-slate-600`, on
  `bg-blue-900 border-blue-900`. The `h-5 w-5` white thumb moves from left (off) to right (on),
  so the state is also conveyed by position, not colour alone. Transitions are 150ms and
  disabled under `motion-reduce`. The thumb's transparent border keeps it visible in forced
  colours.
- **Help text:** A `px-2 text-sm text-slate-600` paragraph below the switch, referenced by
  `aria-describedby`, describes the current state. Its `px-2` matches the button's horizontal
  padding, so the label and help text start at the same x-position in every state; the button
  keeps its padding and 48×48px target. The header constrains the control group to `w-full
  max-w-xs` within a shrinkable column, independently of help-text length. The switch button
  fills that width and uses `justify-between`, keeping the label, track and help text in place
  across states; only the thumb moves. From `48rem`, the group offsets its trailing 8px padding
  with `-mr-2`, so the track reaches the cards' right edge while label and help retain their
  shared left edge. The label
  **"Sparad information"** is the same in every state. Copy: off **"Visar aktuell information
  från internet."**, on **"Visar endast information som är sparad på enheten."**, on without a
  connection **"Visar endast information som är sparad på enheten. Du kan stänga av det när
  internetanslutningen är tillbaka."**
- **Restricted state:** Uses `aria-disabled="true"` rather than `disabled`, so the switch stays
  focusable and its explanation is read. Only the track is dimmed (`opacity-60`) and the button
  shows `cursor-not-allowed`; the label and help text keep full contrast.
- **Reflow:** The button wraps (`flex-wrap`), so at enlarged text sizes the track moves below the
  label rather than being clipped. The track's `ml-auto` keeps it at the right edge on either row.
- **Contrast:** The off and on tracks against white are expected to exceed 3:1 (`slate-600`
  approximately 7.5:1, `blue-900` approximately 10:1), and the white thumb is the same pair in
  reverse. The restricted state only occurs while the switch is on, so the dimmed track to
  measure is `blue-900` at `opacity-60` against white. These values must still be verified with
  a contrast checker as required by section 2.5.

### 6.6 Install App Button

- **Variant:** The text button (section 6.2.3) with a decorative download icon in both places. In
  the header it has less visual weight than the "Sparad information" switch; in the mobile menu
  the underline, blue text and icon distinguish it from the navigation links. The visible label
  **"Installera app"** is the accessible name in both; no `aria-label`.
- **Placement:** From `48rem`, beside connectivity status in the header's left column, with a
  16px horizontal gap. The row wraps with an 8px vertical gap when space is limited. The button
  stays outside the status live region; the connection-loss notice spans the space below the
  row. The right column contains the switch and active address, whose trailing padding and
  offset align the track and address link with the cards' right edge. The address link can wrap
  within the column, including long words. Header columns can shrink and have a 24px gap.
  Status/installation and the address occupy the same final desktop grid row, aligned by their
  first text baseline. The status dot and install icon use `self-center`, so the text supplies
  the baseline instead of the decorative shapes. The switch spans the preceding brand, tagline
  and flexible rows, so longer help text does not spread the brand and tagline apart. Below
  `48rem`, right-aligned in a fixed footer at the bottom of the `MobileMenu` dialog, separated
  from the links by a 1px top border. The footer sits below the scrolling link region, so the
  button stays visible while the links scroll above it, and it is the last control in DOM,
  visual and Tab order. The footer's 12px vertical padding keeps the button's extended 48px hit
  area clear of the links. It is an action, not a page, so it is never part of the navigation
  links.
- **Visibility:** Rendered only while the browser offers installation; no space is reserved
  otherwise. Placing it beside status avoids an additional row below the active address. The
  header still grows naturally when text or controls need to wrap, without overlap or clipping.
  The menu footer uses `empty:hidden`, so neither the footer nor its divider is shown while the
  button is not rendered.
- **Stable desktop row:** The header's install wrapper uses `-my-1.5 flex`: its 6px negative top
  and bottom margins offset the text button's `py-1.5`, giving it the same 20px outer height and
  text baseline as the status line. Flex layout avoids an extra inline line box around the
  button. The visible button remains 32px high with its existing 48px hit area and outward focus
  outline. Nothing is reserved while it is absent, and the header's initial height is unchanged.
  Keep the wrapper offsets in sync with the button's vertical padding, and verify spacing,
  clipping and hit-target overlap when changing either. The mobile menu has no such offsets.
- **Focus:** Selecting it opens the browser's prompt and removes the button. In the header focus
  moves to `#page-heading`; in the menu the dialog closes and focus returns to the **Meny** button.

### 6.7 Install Instructions (proposal)

> **Status: proposal awaiting team approval (section 11.1).** Implemented in `InstallInstructions`.
> It reuses existing tokens only.

- **Surface:** A section 5.1 card without the hover state or accent bar, `p-4`, named **Installera
  appen** with `aria-label`. It uses `text-slate-700` body text and no heading, because it precedes
  the page `h1`.
- **Placement:** In normal flow in `main`, after the app-update slot and before the page, with a
  16px bottom margin. It is not fixed, so it covers no content and needs no safe-area or scroll
  spacing.
- **Icon:** A 20×20px inline SVG share icon in `text-blue-900` beside the word "Dela". It is
  `aria-hidden="true"` and `focusable="false"`, because the text names it.
- **Close:** The text button (section 6.2.3) with the visible label **Stäng** and the accessible
  name **Stäng installationsinstruktionen**, at least 48×48px including its hit area. It wraps
  below the text on narrow screens.
- **Focus:** The card never takes focus on its own and has no live region. Closing moves focus to
  `#page-heading`.

### 6.8 Shared Footer (proposal)

> **Status: proposal awaiting team approval (section 11.1).** Implemented in `Footer`. It reuses
> existing tokens only.

- **Placement:** a semantic `<footer>` (the `contentinfo` landmark) after `main` in `AppLayout`,
  on every route. The layout root is a flex column and `main` is `flex-1`, so the footer sits at
  the bottom of the viewport on short pages.
- **Surface:** a slim, full-width, matte neutral band (`bg-slate-50` with a single `border-t
  border-blue-200`), deliberately not a card and not a saturated block. Its content sits in the
  `max-w-4xl` shell (`px-4 sm:px-6`) with `py-1.5` below `md` and `md:py-3` from `md`, and no fixed height, so enlarged text reflows.
  It has no heading, link or other interactive element, no signature bar, no amber line and no
  divider, so it stays quieter than the header and hero.
- **Desktop (from `md`):** one row, `justify-between`, vertically centred. Left: a 20px compass
  icon and the message. Right: the copyright line.
- **Mobile:** stacked with no gap (`leading-snug` on the message): the icon and message first (icon aligned to the first text
  line), the copyright line directly below, right-aligned to the content edge (`text-right`
  at every width). The message is `text-[13px]` below `md` and `text-sm` from `md`; the copyright
  stays `text-sm`. Text wraps normally.
- **Compass icon:** an inline 24×24 outline SVG (a circle with a small needle, section 5.3
  style, 1.8 stroke, `currentColor`) at `size-5 text-blue-900`, `aria-hidden`,
  `focusable="false"` and titleless. It is drawn separately from `CompassHeroMotif`, which
  would be unclear at this size.
- **Message:** **"Din kompass till tydlig information och bättre beredskap – före och under en
  kris."** in `text-sm text-slate-700`, regular weight.
- **Copyright:** **"© 2026 KrisKompassen"**, `text-sm text-slate-600`. It makes no further legal
  statement.
- **Contrast:** `slate-700` and `slate-600` on `slate-50` are approximately 9.5:1 and 7.2:1,
  computed from the palette values and still to be confirmed with a contrast checker
  (section 2.5).
- **Mobile bottom clearance:** a separate `aria-hidden` spacer after the `<footer>`, as tall as
  the measured menu bar (`h-[var(--navigation-height,0px)]`, section 4.2), keeps the fixed bar
  from covering the footer without adding empty space inside it. It is `0px` from 48rem upwards.
- **Permanent backup on Inställningar:** `InstallHelpSection` follows the address form, outside it,
  using a section 5.1 card with `mt-8 p-6 sm:p-8`. Its `h2` **Installera appen** names the section
  through `aria-labelledby`. The native `details` summary **Visa installationshjälp** retains
  its disclosure marker and has a minimum 48px target, visible focus and underline. It starts
  closed on every page visit, uses no storage and opens inline without taking focus elsewhere.
  Instructions for **Chrome på dator**, **iPhone och iPad** and **Safari på Mac** have `h3`
  labels. All variants remain available regardless of browser install offers, platform detection
  or a dismissed automatic card. The automatic card and backup share `InstallInstructionsContent`;
  no automatic visibility, dismissal or install-button behaviour changes.

---

## 7. Navigation Patterns

KrisKompassen shows the same primary links, from the shared `navigationItems` list, through two components: `BottomNavigation` (desktop) and `MobileMenu` (mobile). Never duplicate the labels or paths.

Both decide the current page with `isNavigationItemActive()`. An item matches its own path exactly unless it lists `activePaths`: **Krisinformation** stays current on the overview and on every part (`/crisis`, `/crisis/:id`, `/telefonnummer`, `/varningssignaler`, `/lugn-i-kris`), and at most one item is current on any page.

### 7.1 Responsive Placement

- **Mobile Viewports (`width < 48rem`, any height):**
  The in-flow navigation is hidden. `MobileFooter` is a fixed, full-width `<nav aria-label="Huvudmeny">` at the bottom of the viewport (`fixed inset-x-0 bottom-0 z-5`) with a continuous yellow surface (`bg-amber-300`) and a 2px blue top border (`border-t-2 border-blue-900`). Its single native **Meny** button fills the width, including the safe-area padding described in section 4.2, without a separate rounded frame. The button centres a decorative 24×24px hamburger SVG (`aria-hidden`, `focusable="false"`) and the visible text "Meny" with a 12px gap (`gap-3`), normal-weight 16px text and a dark blue foreground (`text-blue-900`). It uses at least 48×48px targets, 12px top padding, `hover:bg-amber-200` and `active:bg-amber-400`. The whole button surface opens the menu. The field stays fixed while scrolling and in landscape; its measured height continues to reserve content space.
- **Desktop & Wide Viewports (`width >= 48rem`):**
  `BottomNavigation` sits directly beneath the header, with a 2px top border in the page canvas colour (`border-t-2 border-t-[#D7E2EF]`) and a 1px bottom border (`border-b border-b-slate-200`). It is sticky (`md:sticky md:top-[var(--vma-banner-height,0px)] md:z-20`): the header scrolls away while the bar stays pinned directly below the VMA notice, or at the viewport top when no notice is shown. Its solid white surface keeps content from showing through, and a subtle `shadow-sm` separates it from content scrolling beneath. The shadow is always shown from `48rem`, because CSS cannot detect when the bar is pinned. The current link keeps its non-colour cue while pinned. Links wrap onto further rows; there is no horizontal scrolling. The Meny button and dialog are not shown.

### 7.2 Mobile Menu Dialog

- A native modal `<dialog>` named **Meny** covers the whole viewport, including the header and the VMA notice, on a white surface with safe-area padding. The dialog element itself is fullscreen (`.mobile-menu-dialog`: fixed, `inset: 0`, no margin or border, `width: 100%`, `height`/`min-height: 100dvh`, no max-width/max-height), not only its backdrop. A **Stäng menyn** outlined button (48×48px minimum) sits in a fixed top row beside the heading; the link list below scrolls internally (`overscroll-contain`), so short screens and enlarged text remain usable. When the browser offers installation, a fixed footer below the list holds the **Installera app** button (section 6.6).
- Links are full-width 48px-minimum rows in list order (Hem, Krisinformation, Min krislåda, Skyddsrum, Inställningar). The current route uses `aria-current="page"` and the same non-colour cue as desktop (blue fill, bold, underline).
- The modal makes the page inert, locks page scrolling and wraps Tab at its boundaries. Escape and **Stäng menyn** return focus to the Meny button, as does selecting the current route. Selecting another route closes the menu and leaves focus to the layout page-heading focus; this includes selecting Krisinformation while it is current on one of its parts, because that leads to the overview. Crossing `48rem` while open closes it without focusing the hidden button and moves focus to `#page-heading` (without scrolling or navigating). There is no animation.

### 7.3 Back Links

- Each krisinfo part and each article starts with a `BackLink` to its fixed parent: **"Tillbaka till krisinformation"** to `/krisinformation` on Innan krisen, Telefonnummer, Utomhusvarning and Lugn i kris, and **"Tillbaka till Innan krisen"** to `/crisis` on an article.
- It is an ordinary router link, never `history.back()`, so it leads to the same page when the current page was opened directly or offline.
- Style: `inline-flex min-h-12 items-center gap-1 font-medium text-blue-900 underline underline-offset-4` with a decorative `←` (`aria-hidden`), so the accessible name is the label alone. It includes its 24px (`mb-6`) spacing to the heading or card below it.
- It sits before the `h1` in DOM order. Route focus moves to the `h1`, so keyboard users reach the link with Shift+Tab, as on article pages.

---

## 8. Focus, Keyboard, and Interactive States

### 8.1 Universal Focus Indicator

A centralized, prominent focus outline is defined in `frontend/src/index.css`:

```css
:where(a, button, summary, [tabindex]):focus-visible {
  outline: 3px solid var(--color-blue-900);
  outline-offset: 4px;
}
```

- **Outline Width:** 3px solid deep blue (`#1e3a8a`).
- **Outline Offset:** 4px spacing between element border and the focus line, preventing clipping against rounded corners.
- **Mobile menu field:** `.mobile-menu-trigger:focus-visible` uses a 4px inward offset so the full-width button's 3px outline stays inside the viewport. It inherits the global blue outline and the system `Highlight` colour in forced-colours mode.
- **Visibility:** Uses `:focus-visible` to display rings for keyboard navigation while suppressing them during mouse clicks.
- **VMA warning surface:** Uses `--color-vma-focus` (white) instead of blue, as defined in section 2.4.1. The scrollable warning region uses a 4px inward offset to keep its outline within the viewport.

### 8.2 High Contrast / Forced Colors Mode

For users who rely on Windows High Contrast / Forced Colors:

```css
@media (forced-colors: active) {
  :where(a, button, summary, [tabindex]):focus-visible,
  .vma-banner:focus-visible,
  .vma-banner :focus-visible {
    outline-color: Highlight;
  }
}
```

This ensures that system focus outlines adapt to the user's chosen high-contrast theme colours (`Highlight`).

### 8.3 Route Transition Focus Management

- **Heading Target:** Every routed page renders a single `h1` with `id="page-heading"` and `tabIndex={-1}`.
- **Focus Shift:** On pathname transitions, `AppLayout` moves keyboard focus to the `h1` element and scrolls only as needed to reveal it (`block: "nearest", inline: "nearest"`).
- **Document Title:** The document title (`document.title`) is automatically synchronized with the `h1` text: `${heading} | KrisKompassen`.

### 8.4 Full VMA Message Dialog

- A native modal dialog sits outside `main` in the browser's top layer with a dimmed backdrop.
  Use a white `rounded-2xl` reading surface, blue headings, slate body text and a visible VMA label.
  The full message does not use the red banner surface, since its validity can change while open.
- Limit its width to 48rem and the available viewport width; limit height using `100dvh` minus
  safe-area insets and outer margins. Keep the Stäng row above a separate scrolling content region.
  Long titles/text/links wrap. Paragraphs have spacing and single line breaks are preserved.
- Opening focuses the heading (`tabIndex={-1}`); `aria-labelledby` names the dialog without
  announcing the entire message through `aria-describedby`. The background is inert and scroll
  locked. Tab/Shift+Tab wrap at boundary controls; Stäng/Escape close it and backdrop clicks do not.
- Restore focus to the originating title button if it still represents the selected CAP ID,
  otherwise the page heading. Opening/closing leaves the route, document title and mode intact.
- Keep selected text readable after expiry, replacement or cancellation. Neutral status copy
  explains validity/request uncertainty, and expiry never claims the danger has ended. Source
  and validated SR information links announce that they open in a new tab.
- The close button uses a pointer cursor. The information link falls back to the source homepage
  when no message link is supplied or SR's unavailable `/vma` address is supplied.

---

## 9. Asynchronous Feedback and Live Regions

KrisKompassen performs offline storage operations and network calls that must be communicated immediately and accessibly.

### App Update Notice

- A completed app update uses the existing white card surface, `border-blue-200/80`,
  `rounded-2xl`, `shadow-sm`, blue heading and primary button. It is informational; it does not
  use the active VMA warning surface or icon.
- The notice appears before routed content. At heights of at least `40rem`, its layout slot is
  sticky below the measured VMA and sticky desktop navigation heights with z-index 10 (VMA 30,
  desktop navigation 20, mobile footer 5). The visible region
  is limited to `25dvh` and scrolls internally. Lower viewports use unrestricted normal flow.
- The layout includes the measured slot height in `--pwa-update-height` and root scroll padding.
  Focused page controls are revealed below both notices; update controls in normal flow receive
  the same protection. Internal scrolling retains full copy and access to the 48×48px button.
- A persistent `role="status"`, named **Appuppdatering**, announces availability, activation and
  action failure politely. It does not take focus or reannounce on route changes. The visible,
  keyboard-scrollable region is named **Uppdatering av appen**; its outline is inset to remain
  visible inside the scroll boundary.
- The action says **Uppdatera appen**, or **Uppdaterar appen…** while disabled. The offer remains
  until selection. App versions and build timestamps are not displayed in the user interface.
- Contrast uses the existing blue/white and slate/white palette. Actual rendering, reflow and
  spoken screen-reader output must be verified in the installed app during the live check.

### 9.1 Status vs Alert Live Regions

- **Informational Confirmations (`role="status"`):**
  - Text colour: `text-green-800 font-medium text-sm`.
  - Used for non-disruptive confirmations (e.g. *"Artikel har sparats för offlineåtkomst"*).
  - Screen readers announce politely without interrupting critical ongoing speech.
  - **Offline articles:** Keep the confirmation sentence visible below the controls in the green
    style above. Shorten only names longer than ten characters to the first seven characters
    (trimmed at the end) followed by `…`, for example **"Toalett…"**. Keep the rest of the
    sentence intact and preserve full article titles in headings, links and button names.
    Inside `role="status"`, the shortened sentence is `aria-hidden` and an `sr-only` copy
    carries the full sentence with the complete title, so screen readers announce which
    article was saved or removed.
    A single grid cell reserves the larger natural height of the save
    and removal messages from the start, using invisible, `aria-hidden` sizing copies outside
    the actual live region. Reuse the same message strings, width and typography for sizing and
    display, allowing natural wrapping and enlarged text without fixed heights, clipping or
    overlapping controls. The real `role="status"` stays mounted and empty until an operation
    succeeds, then retains its message until the next action or page change. Align its text to
    the bottom of the reserved cell, leaving only the normal card padding below the message.
    Keep the error region mounted in the same feedback block; only a non-empty error adds
    `mt-3` spacing. Storage errors remain visible and may expand as needed.
- **Urgent Errors (`role="alert"`):**
  - Text colour: `text-red-800 font-medium text-sm`.
  - Used for action failures (e.g. storage quota exceeded, device storage blocked).
  - Screen readers announce assertively.
- **Connection status:**
  - The always-present "Ansluten" / "Ingen internetanslutning" line is a `role="status"` region, so connectivity changes are announced politely. The explanation that "Sparad information" was turned on automatically remains a separate `role="alert"`.
- **VMA warnings and request status:**
  - A persistent, visually hidden `role="alert"` announces the newest active VMA title only when a new message becomes the newest. The visible icon is excluded from this announcement.
  - A persistent, visually hidden polite live region announces changes in the number of active messages (for example *"2 aktiva VMA."*, and *"1 aktivt VMA."* after a drop to one). It stays silent for a single first warning, which the alert already announces.
  - Banner title and list buttons use `aria-haspopup="dialog"` and reference their metadata line with `aria-describedby`. The disclosure uses `aria-expanded` and `aria-controls`. If a focused list entry disappears, focus moves to the disclosure, or to the newest headline when the list is gone; arriving messages never take focus.
  - Loading, failure and incomplete-information messages use `role="status"`. Their text inherits the foreground of the warning or neutral status surface defined in section 2.4.1.
  - Background polling does not change the status text; it is announced only when the state changes. A separate visually hidden polite region announces *"VMA-informationen är uppdaterad."* when outdated or unavailable information is successfully updated.

### 9.2 Symbol Representation

Icons used for offline storage status:
- `✓` (Unicode checkmark): saved offline.
- `○` (Unicode empty circle): not saved offline.
- `…` (Horizontal ellipsis): operation in progress / verifying.

All visual icons must be accompanied by explicit text descriptions (`"Sparad offline"`, `"Inte sparad"`, `"Kontrollerar sparad status…"`).

The VMA warning uses an outlined triangle with an exclamation mark beside its explicit VMA label. Use the inline SVG described in section 2.4.1 rather than an emoji, so its shape and contrast remain consistent across platforms.

---

## 10. Accessibility Rules Summary (WCAG 2.2 AA Baseline)

| Requirement | Implementation in KrisKompassen |
| --- | --- |
| **1.3.1 Info and Relationships** | Strict landmark hierarchy (`header`, `nav`, `main`), one single `h1` per page, semantic `article` and `section` tags. |
| **1.4.3 Contrast (Minimum)** | All text/background pairs target >= 4.5:1 (normal text) and >= 3.0:1 (large text/controls). Ratios must be verified upon implementation. |
| **1.4.1 Use of Color** | States use text labels, icons (`✓`/`○` and the VMA warning triangle), underlines, and weight changes. Never colour alone. |
| **2.1.1 Keyboard Navigation** | All interactive controls reachable and operable by keyboard alone. |
| **2.4.1 Bypass Blocks** | Prominent skip link (`Hoppa till huvudinnehållet`) at top of DOM. |
| **2.4.7 Focus Visible** | 3px deep blue outline with 4px offset on `:focus-visible`; white on the VMA warning surface, inset for its scrollable region. High-contrast mode fallback. |
| **2.5.8 Target Size (Minimum)** | Exceeds WCAG 2.2 AA (24×24 CSS px) by enforcing KrisKompassen's internal standard of at least 48×48 CSS pixels (`min-h-12 min-w-12`) for improved touch usability, older adults, and high-stress scenarios. |
| **3.1.1 Language of Page** | `<html lang="sv">`. All user-facing UI text in Swedish. Code documentation in English. |
| **4.1.3 Status Messages** | `role="status"` and `role="alert"` used for asynchronous feedback. |

---

## 11. Implementation Guidelines for Future Work

### 11.1 Reuse Before Inventing
Before introducing a new colour, border radius, box shadow, type size, spacing value, or component pattern, **reuse the existing design system where possible**.
- Use the established tokens (`blue-900`, `slate-800`, `slate-700`, `slate-600`, `text-3xl`, `text-xl`, `text-base`, `rounded-2xl`, `rounded-xl`).
- Do not introduce one-off colours or arbitrary spacing classes when existing tokens suffice.
- Any new recurring visual conventions, component variants, or semantic tokens must be discussed, agreed by the team, and documented in this design system before adoption.

### 11.2 Core Rules Checklist for New Features
When developing new pages or components:

1. **Do Not Add External Fonts:** Rely strictly on the native sans-serif stack to preserve resilient rendering.
2. **Verify Contrast:** Always test foreground/background colour pairings with an accessibility contrast checker.
3. **Preserve Target Size:** Ensure every new interactive element satisfies the 48×48px standard (`min-h-12 min-w-12`).
4. **Maintain Focus Landmarks:** Every new routed page must include an `<h1 id="page-heading" tabIndex={-1}>` as its primary heading.
5. **Support Swedish Word Lengths:** Apply `wrap-anywhere` to headings, long titles, and navigation labels.
6. **Keep Headings Hierarchical:** Nest heading levels logically beneath the page `h1` without skipping levels (for example `h1` → `h2` → `h3`). Choose the level from the document outline, not the visual size.
7. **Announce Status Changes:** Important visible changes that happen without moving focus (connectivity, save results, errors, update availability) must also be exposed programmatically with `role="status"` or `role="alert"` as described in section 9.1.
