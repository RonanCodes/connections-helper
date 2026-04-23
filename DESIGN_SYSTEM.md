# Design System

The contract for how UI elements in this app look and behave. Read this before
adding a button, input, card, or any other piece of chrome. If you find yourself
hand-rolling Tailwind classes for something that looks like a button, stop and
use `<Button variant="...">` instead.

## Source of truth

| Concern                                       | Lives in                           | Why there                                                    |
| --------------------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Colour values (per theme)                     | `src/lib/themes/css/*.css`         | CSS custom properties — change once, whole theme updates     |
| Tailwind utility bridge                       | `src/styles.css` (`@theme inline`) | Maps `--background` → `bg-background` etc.                   |
| Semantic tokens (typography, spacing, radius) | `src/design-system/tokens.ts`      | Typed, autocomplete, importable in JS                        |
| Component variants                            | `src/components/ui/*.tsx` (`cva`)  | Enforcement layer — one canonical set of classes per variant |
| This document                                 | `DESIGN_SYSTEM.md`                 | Rules, rationale, review checklist                           |

Change flow: edit the CSS var → every token and component updates. Edit the
tokens file → every import site updates. Edit a `cva` variant → every caller
updates. You should almost never hand-write a colour/radius/spacing value.

## Core rules

These are non-negotiable — the review checklist enforces them.

1. **Radius is a property of the element, not the state.** A button's
   `rounded-md` must be the same in rest, hover, active, focus, and disabled.
   Never switch from `rounded-md` to `rounded-lg` when a button becomes active.
   Same for cards, inputs, badges.
2. **Active means pressed, not emphasised.** The active state is the momentary
   look while the user is clicking (mouse down). It should be subtly _darker
   or inset_ (bg gets darker, translate down 1px). Never use `scale-110` or a
   larger ring to signal active — that says "emphasised/selected", which is a
   different concept (see Toggle below).
3. **Every variant must define rest + hover + active + focus-visible +
   disabled.** Missing a state means the button feels dead in that state.
4. **Focus ring is always the same.** 3px, `ring-ring/50`, outline-none. Don't
   customise per variant — accessibility depends on predictability.
5. **Colour comes from tokens, never from hex.** If you need `#efefe6`, the
   theme already has it as `--card` or `--muted`. If it genuinely doesn't, add
   the token; don't inline a hex.
6. **One radius scale.** `rounded-sm` (badges), `rounded-md` (buttons/inputs),
   `rounded-lg`/`rounded-xl` (cards, dialogs), `rounded-full` (pills). No
   `rounded-[7px]` one-offs.

## Buttons

All buttons must go through `<Button>` (`src/components/ui/button.tsx`).

### Variants — intent mapping

| Variant             | Intent                | When to use                                                     |
| ------------------- | --------------------- | --------------------------------------------------------------- |
| `default` (primary) | Main action           | The one action the user is here to take. One per screen/dialog. |
| `secondary`         | Supporting action     | Second-most-important action. Lives next to primary.            |
| `outline`           | Neutral toggle/filter | Choices, filters, non-destructive alternatives                  |
| `ghost`             | Inline / toolbar      | Icon buttons, row actions, header controls                      |
| `destructive`       | Irreversible action   | Delete, discard, reset. Rare.                                   |
| `link`              | Inline navigation     | Text-like link inside a paragraph or form                       |

### State table

Every variant honours this table — the `cva` definition bakes it in.

| State         | Visual                            | Implementation                                     |
| ------------- | --------------------------------- | -------------------------------------------------- |
| Rest          | Variant's base bg + text          | Variant classes                                    |
| Hover         | Bg darkens ~10% (or opacity-90)   | `hover:bg-primary/90`                              |
| Active        | Bg darkens ~20%, translate Y +1px | `active:bg-primary/80 active:translate-y-px`       |
| Focus-visible | 3px ring in `--ring` colour       | In base classes                                    |
| Disabled      | 50% opacity, pointer-events none  | `disabled:opacity-50 disabled:pointer-events-none` |

**Radius does not change across any row.** If your button's border-radius
changes between states, it's a bug.

### Sizing

| Size                    | Height | Padding | Use                          |
| ----------------------- | ------ | ------- | ---------------------------- |
| `xs`                    | 24px   | `px-2`  | Inline chips, very dense UIs |
| `sm`                    | 32px   | `px-3`  | Toolbars, secondary actions  |
| `default`               | 36px   | `px-4`  | Most places                  |
| `lg`                    | 40px   | `px-6`  | Primary CTAs, hero sections  |
| `icon`, `icon-xs/sm/lg` | square | n/a     | Icon-only                    |

## Inputs

All text inputs must go through `<Input>` (`src/components/ui/input.tsx`).

| State                  | Visual                                           |
| ---------------------- | ------------------------------------------------ |
| Rest                   | `border-border bg-background`                    |
| Hover                  | Border darkens slightly (`border-foreground/30`) |
| Focus-visible          | Same 3px ring as buttons                         |
| Disabled               | 50% opacity, `cursor-not-allowed`                |
| Invalid (aria-invalid) | Border + ring in `--destructive`                 |

Radio / checkbox: native HTML is fine for now; colour them with
`accent-primary` so they pick up the theme. A wrapping `<label>` gives them the
clickable hit target and hover state.

## Cards & surfaces

All containers come from `<Card>` and its sub-parts (`CardHeader`,
`CardContent`, etc.). Three elevation tiers:

| Tier     | Look                              | Use                                |
| -------- | --------------------------------- | ---------------------------------- |
| Flat     | `border border-border`, no shadow | Default Card                       |
| Raised   | `+ shadow-sm`                     | Interactive lists, hoverable tiles |
| Floating | `+ shadow-md`                     | Popovers, menus                    |
| Overlay  | `+ shadow-xl`                     | Dialogs, full-screen sheets        |

Radius: cards are `rounded-xl`, dialogs are `rounded-lg` (set by `DialogContent`).

## Typography

Use tokens from `src/design-system/tokens.ts`:

- `TYPOGRAPHY.display` — top-of-page hero heading
- `TYPOGRAPHY.h1` / `h2` / `h3` — section headings
- `TYPOGRAPHY.body` / `bodyLg` — paragraph text
- `TYPOGRAPHY.caption` — muted small text (e.g. under-label hints)
- `TYPOGRAPHY.label` — form labels, section headings inside dialogs

Never combine more than two type sizes in a single component; density is what
the user reads as hierarchy.

## Spacing

Four-pixel grid. Use the semantic names from `SPACING` in tokens.ts:

- `xs` 4px · `sm` 8px · `md` 12px · `lg` 16px · `xl` 24px · `xxl` 32px

Tailwind utilities map 1:1 (`gap-1` = 4px). Prefer the token when the spacing
has semantic meaning ("between related controls" → `md`); use raw utilities
when it's just layout arithmetic.

## Interaction patterns (not just buttons)

### Toggle (on/off) vs. Active (pressed)

These are different concepts; don't conflate them.

- **Toggle on**: persistent state. Visual should clearly read "selected" —
  filled bg, bold border, accent colour. Think of the theme picker cards in the
  settings dialog: selected = dark border + muted bg.
- **Toggle off**: neutral outline, muted content.
- **Active (pressed)**: momentary, only visible during mouse-down. Same element
  whether on or off, always darker/inset — never scaled up.

**Common mistake** (present in this app as of 2026-04): the category hints
button uses `scale-110` in its "on" state and `scale-105` on hover. That makes
"on" and "hover" feel like the same category of emphasis, and neither reads as
"pressed". Should be: **toggle-on** = filled with accent colour, **hover** =
subtle bg change, **active (mouse-down)** = translate-y-px + bg darker.
Slated for audit/cleanup after this spec lands.

### Pressed feedback

Every clickable element should translate down 1px on mouse-down.
`active:translate-y-px` handles this in `Button`. For custom clickables, add
the same class.

## Review checklist

When adding or reviewing a UI component, check:

- [ ] No hand-rolled colours — all via tokens / Tailwind utilities
- [ ] `rounded-*` identical across all states
- [ ] Rest + hover + active + focus-visible + disabled all defined
- [ ] Active state is subtle (darker/translate), not emphasised (scaled/ringed)
- [ ] If it's a toggle, on/off state is distinct from hover state
- [ ] If it's a button, it's a `<Button variant="...">` — not a raw `<button>` with tailwind
- [ ] If it's an input, it's an `<Input>`
- [ ] No `text-[14px]`, `p-[13px]` one-offs — use the scale

## When to deviate

The system is opinionated, not a cage. Legitimate reasons to deviate:

- A third-party widget you embed (calendar, chart) has its own visual language —
  scope overrides in the theme CSS file, not per component call site.
- A genuinely new role (e.g. a "confirm destructive" modal pattern) — add a new
  variant with a state table, don't inline.
- Marketing/landing pages with intentional display typography — keep them in
  their own route and document the deviation inline.

If you deviate for reasons not in the list, add the reason to this doc. The
next person reading the code should be able to tell whether the deviation was
considered or accidental.
