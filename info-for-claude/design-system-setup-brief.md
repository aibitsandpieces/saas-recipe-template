# Design System Setup

## Goal

Set up CSS variables and Tailwind utilities so the portal uses a consistent colour palette that can be changed in one place.

**Do this before applying any colours to the navigation or other components.**

---

## Step 1: Add CSS Variables to globals.css

Add these variables inside the `:root` block in `app/globals.css`. Place them alongside the existing shadcn variables - don't remove the shadcn ones.

```css
:root {
  /* ═══════════════════════════════════════════════════════════════
     DESIGN SYSTEM TOKENS
     ═══════════════════════════════════════════════════════════════ */
  
  /* Sage family (primary brand) */
  --sage-deep: #5a6b5e;
  --sage: #7c9082;
  --sage-soft: #e8eeea;
  --sage-whisper: #f4f7f5;
  
  /* Neutral backgrounds */
  --warm-white: #fdfcfa;
  --cream: #f9f7f3;
  --paper: #f5f2ec;
  
  /* Text colours */
  --ink: #262d2f;
  --ink-soft: #4a5154;
  --muted: #7f8c8d;
  --mist: #c8d0ca;
  --fog: #a3afa6;
  
  /* Amber family (accent/action) */
  --amber: #D4874C;
  --amber-deep: #B8703D;
  --amber-mid: #E8C4A0;
  --amber-glow: #F5E6D3;
  
  /* Semantic colours */
  --danger: #c0392b;
  --danger-light: #e74c3c;

  /* Existing shadcn variables below - keep them */
}
```

---

## Step 2: Extend Tailwind with Custom Colours

Since this project uses Tailwind CSS v4 with inline configuration, add the custom colours in `globals.css` using the `@theme` directive.

Find where Tailwind is configured (likely near the top of `globals.css` or in a separate Tailwind config section) and add:

```css
@theme {
  --color-sage-deep: var(--sage-deep);
  --color-sage: var(--sage);
  --color-sage-soft: var(--sage-soft);
  --color-sage-whisper: var(--sage-whisper);
  
  --color-warm-white: var(--warm-white);
  --color-cream: var(--cream);
  --color-paper: var(--paper);
  
  --color-ink: var(--ink);
  --color-ink-soft: var(--ink-soft);
  --color-muted: var(--muted);
  --color-mist: var(--mist);
  --color-fog: var(--fog);
  
  --color-amber: var(--amber);
  --color-amber-deep: var(--amber-deep);
  --color-amber-mid: var(--amber-mid);
  --color-amber-glow: var(--amber-glow);
  
  --color-danger: var(--danger);
  --color-danger-light: var(--danger-light);
}
```

If the project uses a different Tailwind v4 configuration method, adapt accordingly - the goal is to make these colours available as Tailwind utilities.

---

## Step 3: Verify It Works

After adding the variables, test that the utilities work:

1. Add a temporary test element somewhere visible:
```jsx
<div className="bg-sage-deep text-warm-white p-4">
  Design system test - sage deep background, warm white text
</div>
```

2. Check it renders with the correct colours (#5a6b5e background, #fdfcfa text)

3. Remove the test element once verified

---

## How to Use

After setup, use these class names throughout the codebase:

**Backgrounds:**
- `bg-sage-deep` - dark green (headers, dark sections)
- `bg-sage` - medium green
- `bg-sage-soft` - light green (cards, secondary buttons)
- `bg-sage-whisper` - very light green (hover states)
- `bg-warm-white` - default page background
- `bg-cream` - subtle section contrast
- `bg-paper` - warmer background
- `bg-amber` - primary CTA buttons
- `bg-amber-deep` - button hover states
- `bg-amber-glow` - highlight callouts
- `bg-danger` - destructive actions

**Text:**
- `text-ink` - primary text on light backgrounds
- `text-ink-soft` - secondary text on light backgrounds
- `text-muted` - tertiary text (light backgrounds only)
- `text-warm-white` - primary text on dark backgrounds
- `text-mist` - secondary text on dark backgrounds
- `text-fog` - tertiary text on dark backgrounds
- `text-amber` - accent text, links
- `text-danger` - error text

**Borders:**
- `border-sage-soft` - subtle borders
- `border-amber` - accent borders

---

## Rules

1. **Never use hardcoded hex values** like `bg-[#5a6b5e]`. Always use the utility classes.

2. **Text on dark backgrounds:** Use `text-warm-white`, `text-mist`, or `text-fog`. Never use `text-muted` on dark backgrounds - it fails contrast requirements.

3. **Amber is for actions:** Use it for primary CTAs and interactive elements. Don't scatter it everywhere.

4. **One primary action per view:** If using `bg-amber` for a button, limit to one per page section.

---

## Colour Reference

| Variable | Hex | Use For |
|----------|-----|---------|
| `--sage-deep` | #5a6b5e | Headers, dark sections |
| `--sage` | #7c9082 | Progress indicators, secondary elements |
| `--sage-soft` | #e8eeea | Card backgrounds, hover states |
| `--sage-whisper` | #f4f7f5 | Subtle hover, input focus |
| `--warm-white` | #fdfcfa | Page background, card interiors |
| `--cream` | #f9f7f3 | Section contrast |
| `--paper` | #f5f2ec | Warmer backgrounds |
| `--ink` | #262d2f | Primary text (light bg) |
| `--ink-soft` | #4a5154 | Secondary text (light bg) |
| `--muted` | #7f8c8d | Tertiary text (light bg only) |
| `--mist` | #c8d0ca | Secondary text (dark bg) |
| `--fog` | #a3afa6 | Tertiary text (dark bg) |
| `--amber` | #D4874C | Primary buttons, CTAs |
| `--amber-deep` | #B8703D | Button hover states |
| `--amber-mid` | #E8C4A0 | Rarely used |
| `--amber-glow` | #F5E6D3 | Highlight callouts |
| `--danger` | #c0392b | Destructive actions, errors |
| `--danger-light` | #e74c3c | Error highlights |

---

## Done When

- [ ] CSS variables added to `globals.css`
- [ ] Tailwind configured to use custom colours
- [ ] Test element renders correctly
- [ ] `bg-sage-deep`, `text-warm-white`, `bg-amber` etc. all work as utility classes
