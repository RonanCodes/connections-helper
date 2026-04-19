# Design Principles: Connections Helper

Based on UX research and competitive analysis of NYT Games.

## Core Principles

### 1. 📰 Feel Like NYT

Match the NYT Games aesthetic so the helper feels like a natural companion.

**Implementation:**

- Use NYT-inspired color palette (cream, tan, muted tones)
- Clean typography with clear hierarchy
- Ample white space
- Subtle, purposeful animations
- Card-based layout

### 2. 🎯 Help, Don't Spoil

Provide assistance without ruining the puzzle experience.

**Implementation:**

- Show definitions, not category answers
- Hide answers behind confirmation
- Spoiler warnings on reveal
- Shuffle word order (don't show grouped)

### 3. ⚡ Speed is Respect

Users want quick help, not a long experience.

**Implementation:**

- Fast load times (<2s)
- Minimal steps to get definitions
- No mandatory signup
- Preload definitions in background

### 4. 📱 Mobile First

Most NYT Games players are on mobile.

**Implementation:**

- Touch-friendly tap targets (44px min)
- Responsive grid layout
- Works in portrait and landscape
- No hover-dependent interactions

### 5. 🌙 Theme Flexibility

Let users match their preferred NYT experience.

**Implementation:**

- Dark/Light/NYT theme options
- Persist preference
- Smooth theme transitions
- Respect system preference option

## Visual Design Guidelines

### Colors

```css
/* NYT Theme */
--bg-primary: #fafafa;
--bg-card: #efefe6;
--text-primary: #000000;
--text-secondary: #5a5a5a;

/* Category Colors */
--cat-yellow: #f9df6d;
--cat-green: #a0c35a;
--cat-blue: #b0c4ef;
--cat-purple: #ba81c5;

/* UI Colors */
--accent: #6366f1; /* Interactive elements */
--error: #ef4444;
--success: #22c55e;
```

### Typography

- **Headers:** Serif or semi-bold sans-serif
- **Body:** Clean sans-serif (system font stack)
- **Size scale:** 14px (small), 16px (base), 20px (large), 24px+ (headers)

### Spacing

- Base unit: 4px
- Card padding: 16px
- Grid gap: 12px
- Section spacing: 24-32px

### Components

- **Word Cards:** Rounded corners (8-12px), subtle shadow
- **Buttons:** High contrast, clear states
- **Date Picker:** Clean calendar popup
- **Category Pills:** Color-coded when revealed

## Interaction Guidelines

### Loading States

- Skeleton loaders for cards
- Spinner for initial fetch
- Optimistic UI where possible

### Feedback

- Subtle animations on interaction
- Color changes on selection
- Success states when loading completes

### Error States

- Friendly messaging ("Puzzle not found for this date")
- Clear recovery actions ("Try today's puzzle")
- No dead ends

## Accessibility

- WCAG AA contrast ratios
- Keyboard navigable
- Screen reader friendly
- Reduced motion option
- Focus indicators

## Redesign Checklist

- [ ] Update color palette to match NYT
- [ ] Improve typography hierarchy
- [ ] Add proper loading skeletons
- [ ] Better mobile layout
- [ ] Card hover/tap states
- [ ] Category reveal animations
- [ ] Accessibility audit
- [ ] Performance optimization
