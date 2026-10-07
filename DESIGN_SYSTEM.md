# Visual Design System: KrisKompassen

This document defines the visual design system for KrisKompassen. It establishes the shared visual rules, design tokens, component patterns, and accessibility requirements for all frontend user interfaces in the application.

KrisKompassen is a public crisis-information Progressive Web App (PWA) designed for the general public in Sweden. The primary goal during emergencies and public disruptions is to deliver clear, trustworthy, and actionable information (*What happened? What should I do? Where should I go?*) with low cognitive load.

Clarity, readability, accessibility, and resilience under stressful conditions take strict precedence over decorative trends or extraneous visual effects.

---

## 1. Core Principles

1. **Calm and Trustworthy Authority**
   Emergencies cause stress and anxiety. The visual presentation must feel composed, official, and reassuring. Deep blue conveys stability and trust, paired with a soft light-blue content canvas and crisp white content cards. Header and navigation surfaces remain clean white.

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
- **UI Accent Amber (`#FBBF24` / `amber-400`):** A warm yellow brand accent used in the signature crisis-information bar.
- **Surface White (`#FFFFFF` / `bg-white`):** Crisp white content cards and header/navigation surfaces for clear text presentation.

| Token / Name | Hex / Value | Tailwind Class | Usage |
| --- | --- | --- | --- |
| **UI Primary Blue** | `#1E3A8A` | `bg-blue-900`, `text-blue-900`, `border-blue-900` | Primary brand colour, headings, primary buttons, active navigation, focus rings. |
| **UI Dark Blue** | `#172554` | `hover:bg-blue-950` | Primary button hover/active state. |
| **UI Blue Medium** | `#1E40AF` | `bg-blue-800` | Accent bar hover state, interactive highlights. |
| **UI Blue Border** | `rgb(191 219 254 / 0.8)` | `border-blue-200/80` | Subtle card borders against white surfaces. |
| **UI Blue Hover** | `#60A5FA` | `hover:border-blue-400` | Card border hover state. |
| **UI Light Tint** | `#EFF6FF` | `hover:bg-blue-50` | Secondary/outline button hover background. |
| **Page Canvas Background** | `#D7E2EF` | `bg-[#D7E2EF]` | Main application content canvas behind cards and page content. Soft, calming light blue. Header and navigation surfaces remain white. |
| **Surface White** | `#FFFFFF` | `bg-white` | Content cards, header surface, navigation bar, panels. |
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
- **Links and controls:** Source attribution stays underlined. The compact retry button uses inherited foreground colour, a 1px `border-current`, `rounded-md`, a 14px semibold label and `disabled:opacity-70`. Links and buttons retain at least 48×48 CSS pixel targets. This warning-surface variant preserves legibility without introducing a second button background.
- **Focus and contrast:** White text, icon strokes, enabled control borders and focus outlines against the installed Tailwind `red-900` value (`oklch(0.396 0.141 25.723)`) have approximately **10.06:1** contrast. The banner's own outline is inset by 4px to remain visible at the viewport edge; control outlines use the standard 4px outward offset. Forced colours use the system `Highlight` outline and allow the icon to inherit the system foreground. Recheck contrast when changing these tokens.
- **Request states:** Without an active message, loading, failed checks and incomplete information use `bg-slate-100 text-slate-900 border-slate-300` with explicit status text and no warning triangle. A successful empty result hides the banner. A failed check never claims that no VMA exists. If a still-active message is retained after a failed check, its warning styling stays visible alongside the failure text and last successful check time.

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
  All main content sections, header content, and navigation links are constrained to `max-w-4xl` (`64rem` / 1024px) and horizontally centered with `mx-auto`.
- **Canvas and Surfaces:**
  `#D7E2EF` acts as the main application content canvas behind cards and page content. The header and navigation bars remain clean white surfaces.
- **Viewport Safe-Area Insets:**
  Modern mobile screens with rounded corners, notches, and home indicator bars require safe-area handling:
  - Header: `pt-[env(safe-area-inset-top)]`
  - Root container: `pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]`
  - Fixed navigation bar: `padding-bottom: env(safe-area-inset-bottom)`
- **Dynamic Content Offset:**
  When the navigation bar is fixed at the bottom of the viewport on mobile, the root element tracks `--navigation-height` dynamically via `ResizeObserver`. The main container applies:
  `pb-[calc(var(--navigation-height,0px)+2rem)]`
  This reserves sufficient scroll space so no content is obscured behind the fixed bottom bar.

### 4.3 Responsive Content Grids

- **Crisis List Grid:**
  - Mobile (< 640px): 1 column (`grid gap-6`).
  - Tablet & Desktop (>= 640px): 2 equal columns (`grid gap-6 sm:grid-cols-2`).
- **Cards Equal Height:**
  Cards in the grid use `h-full flex flex-col` so that neighbouring cards match heights gracefully regardless of summary length.

---

## 5. Surfaces, Borders, and Elevation

### 5.1 Content Cards and Panels

Content cards represent units of crisis information. They are clean, distinct surfaces floating on top of the `#D7E2EF` light blue main content canvas (while the header and navigation bars remain white surfaces).

- **Background:** Crisp solid white (`bg-white`).
- **Border Radius:** `rounded-2xl` (16px / 1.0rem) with `overflow-hidden`.
- **Border:** `border border-blue-200/80` at rest.
- **Hover State:** `hover:border-blue-400` with `transition-[border-color,box-shadow] duration-150 ease-out`.
- **Shadow:** Subtle resting shadow (`shadow-sm` = `0 1px 2px 0 rgb(0 0 0 / 0.05)`). Interactive cards elevate slightly on hover to `shadow-md`.
- **Avoid Heavy Elevation:** Deep, dark, or multi-layered drop shadows are deliberately avoided to keep visual noise low and prevent perceived clutter.

### 5.2 The Signature Crisis Indicator Bar

The signature top accent bar applies specifically to **crisis-information cards (`CrisisCard`) and crisis-detail surfaces (`DetailedCrisisCard`)**, not to every generic card, panel, empty state, or settings container in the application:

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

---

## 6. Interactive Elements and Controls

### 6.1 Touch Target Sizing (48×48px Project Standard)

- **Target Size Standard:**
  KrisKompassen enforces a project-wide design standard of minimum **48×48 CSS pixels** (`min-h-12 min-w-12`) for all clickable buttons, navigation links, and standalone controls.
- **Rationale vs WCAG Baseline:**
  This intentionally exceeds the WCAG 2.2 AA minimum requirement (Level AA SC 2.5.8 requires 24×24 CSS pixels). Exceeding this baseline ensures comfortable target acquisition on touchscreens, accommodates reduced motor precision among older users or cold/trembling hands during emergencies, and minimizes missed taps under high-stress conditions.
- **Isolated Actions:**
  Interactive controls must never be nested inside other interactive controls. In `CrisisCard`, the entire card title/body links to the detail page, but the offline toggle button resides in an isolated action row outside the link.

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
Used for toggled states or alternate actions (e.g. "Ta bort offlinekopia", "Visa krisinformation").

- **Classes:**
  `inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-blue-900 bg-white text-blue-900 font-semibold px-5 py-3 hover:bg-blue-50 active:bg-blue-50 disabled:opacity-60`
- **States:**
  - Default: 2px solid deep blue border, white background, deep blue text.
  - Hover: light blue tint background (`#eff6ff`).
  - Disabled: `opacity-60`.

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

---

## 7. Navigation Patterns

KrisKompassen uses a single shared navigation component (`BottomNavigation`) that adapts seamlessly across device viewports.

### 7.1 Responsive Placement

- **Mobile Viewports (`width < 48rem` and `height >= 30rem`):**
  Fixed at the bottom of the screen (`position: fixed; inset-inline: 0; bottom: 0`).
  A subtle top shadow (`box-shadow: 0 -4px 16px rgb(15 23 42 / 0.06)`) distinguishes the navigation from the scrolling page content.
- **Desktop & Wide Viewports (`width >= 48rem`):**
  Renders in standard document flow directly beneath the header, bordered by `border-y border-slate-200`.
- **Short Viewports (`height < 30rem` regardless of width):**
  Remains in standard document flow above page content, preventing the navigation bar from blocking content on landscape phones or at high zoom levels.

### 7.2 Link States and Non-Colour Indicators

- **Active Link State:**
  - Background: `bg-blue-900`
  - Text: `text-white font-bold`
  - Indicator: `underline decoration-2 underline-offset-4`
  - Rationale: Combines colour, text weight, and an underline decoration so active state does not rely on colour alone.
- **Layout Shift Prevention:**
  Links use an invisible duplicate label (`aria-hidden="true" invisible font-bold`) positioned in the same CSS grid cell. This reserves the width of the bold font so toggling between active and inactive states causes zero layout shift.
- **Inactive Link State:**
  `font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-900`

---

## 8. Focus, Keyboard, and Interactive States

### 8.1 Universal Focus Indicator

A centralized, prominent focus outline is defined in `frontend/src/index.css`:

```css
:where(a, button, [tabindex]):focus-visible {
  outline: 3px solid var(--color-blue-900);
  outline-offset: 4px;
}
```

- **Outline Width:** 3px solid deep blue (`#1e3a8a`).
- **Outline Offset:** 4px spacing between element border and the focus line, preventing clipping against rounded corners.
- **Visibility:** Uses `:focus-visible` to display rings for keyboard navigation while suppressing them during mouse clicks.
- **VMA warning surface:** Uses `--color-vma-focus` (white) instead of blue, as defined in section 2.4.1. The scrollable warning region uses a 4px inward offset to keep its outline within the viewport.

### 8.2 High Contrast / Forced Colors Mode

For users who rely on Windows High Contrast / Forced Colors:

```css
@media (forced-colors: active) {
  :where(a, button, [tabindex]):focus-visible,
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

---

## 9. Asynchronous Feedback and Live Regions

KrisKompassen performs offline storage operations and network calls that must be communicated immediately and accessibly.

### 9.1 Status vs Alert Live Regions

- **Informational Confirmations (`role="status"`):**
  - Text colour: `text-green-800 font-medium text-sm`.
  - Used for non-disruptive confirmations (e.g. *"Artikel har sparats för offlineåtkomst"*).
  - Screen readers announce politely without interrupting critical ongoing speech.
- **Urgent Errors (`role="alert"`):**
  - Text colour: `text-red-800 font-medium text-sm`.
  - Used for action failures (e.g. storage quota exceeded, device storage blocked).
  - Screen readers announce assertively.
- **VMA warnings and request status:**
  - A persistent, visually hidden `role="alert"` announces the selected active VMA and any indication that more warnings exist. The visible icon is excluded from this announcement.
  - Loading, failure and incomplete-information messages use `role="status"`. Their text inherits the foreground of the warning or neutral status surface defined in section 2.4.1.

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
