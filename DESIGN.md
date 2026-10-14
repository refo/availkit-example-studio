---
name: Appointment Studio
description: A warm reception sheet for understandable appointment requests.
colors:
  paper: "#f5f2e9"
  ink: "#25352e"
  muted: "#5b665e"
  accent: "#355d46"
  line: "#b7c0b5"
  panel: "#fffdf7"
  focus: "#915524"
  selection: "#dce7c9"
  chosen: "#e7eddf"
  choice-hover: "#edf1e6"
  notice-background: "#f8e8d8"
  notice-ink: "#743e19"
  accent-hover: "#284c37"
  button-text: "white"
typography:
  display:
    fontFamily: '"Newsreader", serif'
    fontSize: "clamp(42px, 5vw, 66px)"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "-0.025em"
  headline:
    fontFamily: '"Newsreader", serif'
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"DM Sans", sans-serif'
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "14px"
  legend:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "16px"
    fontWeight: 700
  wordmark:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "23px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  detail:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "15px"
    lineHeight: 1.55
  reference:
    fontSize: "13px"
rounded:
  control: "8px"
  panel: "16px"
spacing:
  base: "8px"
  compact: "4px"
  field: "12px"
  group: "16px"
  inline: "20px"
  section: "24px"
  form-step: "28px"
  layout-compact: "32px"
  context: "40px"
  context-note: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.button-text}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    rounded: "{rounded.control}"
    padding: "0"
  button-text-hover:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
  field:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px"
    width: "100%"
  service-choice:
    padding: "18px 10px"
  service-choice-selected:
    backgroundColor: "{colors.chosen}"
  choice-hover:
    backgroundColor: "{colors.choice-hover}"
  time-choice:
    rounded: "{rounded.control}"
  time-choice-selected:
    backgroundColor: "{colors.chosen}"
    textColor: "{colors.accent}"
  notice:
    backgroundColor: "{colors.notice-background}"
    textColor: "{colors.notice-ink}"
    rounded: "{rounded.control}"
    padding: "16px"
  booking-panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "36px"
  studio-wordmark:
    textColor: "{colors.ink}"
    typography: "{typography.wordmark}"
---

# Design System: Appointment Studio

## Overview

**Creative North Star: "The Appointment Reception Sheet"**

Warm paper, quiet green controls, and fine rules make an appointment request feel readable and orderly. Newsreader headings give the surface a human reception-room voice; DM Sans keeps instructions, choices, and references practical. The form is comfortably spaced, with related choices grouped rather than isolated into decorative cards.

The interface explains what the customer can do and what the operator still needs to confirm. Its visual vocabulary supports native controls, visible selection, clear recovery, and a pending receipt. Studio context sits alongside the form on wider screens and precedes it on small screens.

**Key Characteristics:**
- Warm paper behind a lightly lifted cream form surface.
- Serif headings paired with plain sans-serif instructions.
- Muted green actions, native controls, and grouped choice rules.
- Explicit pending status and recoverable request states.
- Responsive stacking and reduced-motion receipt feedback.

## Colors

The palette combines warm neutrals with a restrained garden-green action color; the frontmatter is the source of exact color values.

### Primary
- **Reception Green** (`accent`): primary buttons, radio accent, input caret, selected time text and border, text actions, and the wordmark dot.
- **Deep Reception Green** (`accent-hover`): enabled primary-button hover.
- **Selected Sage** (`chosen`): the background of selected service and time choices.
- **Hover Sage** (`choice-hover`): service and time-choice hover feedback, including a selected choice while hovered.

### Neutral
- **Warm Paper** (`paper`): the page background.
- **Cream Sheet** (`panel`): the booking surface and native field backgrounds.
- **Forest Ink** (`ink`): primary text and text-button hover.
- **Quiet Ink** (`muted`): hints, contextual information, definitions, and footer copy.
- **Fine Sage Rule** (`line`): dividers and control borders.
- **White Button Lettering** (`button-text`): primary-button text.
- **Text Selection Sage** (`selection`): selected text, paired with Forest Ink.

### Functional
- **Copper Focus** (`focus`): keyboard-focus outlines.
- **Warm Notice Paper** (`notice-background`) and **Notice Brown** (`notice-ink`): alert copy and its surface.

**The Visible State Rule.** A selected time uses a sage surface, green border and text, and stronger type; color alone does not carry its state. Preserve native checked semantics for both service and time radios.

## Typography

**Display Font:** Newsreader, with serif fallback. **Body Font:** DM Sans, with sans-serif fallback. Local font imports supply Newsreader regular and DM Sans regular, medium, and bold; no separate display or icon font is used.

### Hierarchy
- **Display:** the regular serif hero uses the frontmatter's fluid size; at the small-screen breakpoint it becomes (44px).
- **Headline:** regular serif section and receipt headings; small-screen size (32px).
- **Body:** browser-default inherited size with paragraph line-height (1.65), a maximum paragraph measure (65ch), and a tighter studio-introduction measure (29ch).
- **Label:** compact labels, hints, test notice, and service-duration details share the (14px) size.
- **Legend:** bold fieldset titles establish form steps at (16px).
- **Wordmark:** a compact bold sans-serif identity with deliberate negative tracking.
- **Detail:** definition-list values use (15px) and line-height (1.55); references and footer text use (13px).

**The Two Voices Rule.** Reserve Newsreader for headings. Use DM Sans for instructions, fields, choices, actions, and operational details. Price and time choices use tabular numerals; long references wrap anywhere.

## Layout

The centered page has a maximum width (1256px) and desktop padding (40px 56px). A ruled header separates identity from content. The main grid pairs context and form at (1fr 1.45fr), with an (80px) gap and vertical margin (64px). The form surface has (36px) internal padding. Definition lists pair a (100px) term column with a flexible value column, using (12px 20px) gaps.

The base rhythm is (8px). Form steps begin after (28px); legends precede controls by (12px). Paired fields use equal columns and a (16px) gap. Time choices use three columns and an (8px) gap. Fields and primary actions have minimum height (48px); the text action has minimum height (44px).

At (900px) and below, page and panel padding become (28px), the main gap becomes (32px), the grid ratio becomes (1fr 1.4fr), and paired fields stack. At (640px) and below, page and panel padding become (24px 20px); the context/form layout stacks, with content margin and panel separation (32px). Time choices use two columns. Receipt definition lists become one column with a (6px) gap and (12px) separation after each value. The header retains two sides with a (24px) gap; the test note is constrained to (140px) and right-aligned.

## Elevation & Depth

Warm Paper and Cream Sheet supply most of the depth. Only the booking surface has a soft ambient shadow (`0 12px 32px #25352e0c`); fields and choices remain flat and legible through rules and state fills. Focus uses an outline rather than elevation. Primary-button and choice hover feedback changes color without translation or shadow.

**The Sheet Rule.** Keep grouped controls flat inside one lightly lifted form surface; do not give each row its own elevated card.

## Shapes

Controls, time choices, and notices use gently curved corners through the `control` radius. The enclosing sheet uses the larger `panel` radius. Service options remain ruled rows with no independent rounded container. Shared borders are (1px) solid Fine Sage Rule. Native service radios are (18px) square and green-accented; time radios fill the label invisibly while retaining their semantics and keyboard behavior.

## Components

### Buttons

Solid green actions feel direct and calm. Primary buttons use the frontmatter's padding, border and background in Reception Green, white text, and a (48px) minimum height. The submit action spans its container, uses bold type, and follows the preceding content by (28px). Enabled hover deepens green. The underlined text action has a transparent background, no border, and a (44px) minimum height; hover changes the lettering to Forest Ink.

All interactive controls and links use a keyboard-focus outline (3px) in Copper Focus with offset (4px). Disabled buttons and fieldsets have opacity (0.6) and a default cursor. There is no custom active-state styling.

### Cards / Containers

The booking sheet uses Cream Sheet, the larger radius, desktop padding, and the ambient shadow described above. It contains the form, connection guidance, or receipt in the same visual space. Padding contracts at both responsive breakpoints.

### Inputs / Fields

Native text, email, date, and select controls use the shared field token, a fine border, and minimum height (48px). Visible labels precede controls with an (8px) gap. Fieldsets have no border or padding; bold legends give them structure. Required attributes, native input types, and autocomplete remain intact. Focus uses the shared Copper Focus outline; a parent radio label also receives it when its input has visible focus. Error notices are separate alert surfaces rather than invented per-field error borders.

### Service and Time Choices

Service choices are full-width ruled rows with an (18px 10px) inset and (16px) gap. A native radio precedes the title and duration; price sits at the far edge with tabular numerals. Selected rows use Selected Sage. Time choices are centered labels with a fine border and shared control radius; their real radios cover the whole label. Selected times add green text and border and bold weight. Both choice types use Hover Sage on hover.

### Notices and Recovery

Alerts use Warm Notice Paper, Notice Brown, the control radius, and the notice padding; they follow content by (24px) and wrap long strings. Loading messages use `role="status"`; errors use `role="alert"`. When the request result is uncertain, fields remain locked and the submit action becomes “Retry the same request,” retaining the original attempt. A stale time refreshes availability while keeping contact details. Preserve these distinct states rather than adding a reset that could duplicate an unresolved request.

### Pending Receipt

The receipt keeps the serif heading and definition-list grammar. It explicitly says the appointment is pending and shows a wrapping booking reference. The heading receives programmatic focus after success and retains the shared outline for visible keyboard focus. Entry moves vertically from (6px) to rest over (0.25s) with `ease-out`; reduced-motion preference disables the animation. “Book another visit” starts a fresh form after a received request.

### Navigation

The two-line wordmark is an un-underlined home link with a green dot. Ordinary and footer links inherit their text color and use an underline offset (4px), with the shared focus outline. The footer has a fine top rule, (24px) top padding, muted (13px) text, and opposite-side attribution and product link.

## Do's and Don'ts

### Do:
- **Do** preserve the warm paper, cream sheet, quiet green, and fine ruled choice vocabulary.
- **Do** use Newsreader headings and DM Sans for readable form content.
- **Do** keep native fieldset, legend, label, radio, select, and date semantics with visible keyboard focus.
- **Do** keep selected states visible through fill, border or weight as well as native checked state.
- **Do** stack context, paired fields, and receipt details at their documented breakpoints.
- **Do** distinguish pending receipt, stale availability, and uncertain same-request retry.
- **Do** respect reduced motion and wrap long references and alert text.

### Don't:
- **Don't** replace grouped service rows with independently elevated cards.
- **Don't** hide keyboard focus or substitute color for native checked semantics.
- **Don't** style a pending request as a confirmed appointment.
- **Don't** unlock or reset an uncertain request before the original result is resolved.
- **Don't** introduce motion to hover states or animate the receipt under reduced-motion preference.
