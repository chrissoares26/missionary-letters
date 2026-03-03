# Missionary Monday PWA -- Design System

## 1. Product and Audience Foundation

### Product intent
Missionary Monday is a mobile-first PWA that helps one primary user (Mom) create and send weekly encouragement emails fast, in her authentic voice, with low cognitive load and high trust.

### Primary audience
- Mom (primary operator), typically on iPhone Monday morning, often multitasking.
- Optional family admin support user for setup and maintenance.

### UX implications from PRD/spec
- Must feel simple, warm, and dependable.
- Must optimize for one high-priority weekly action: Create -> Review -> Approve -> Send.
- Must privilege readability and large touch targets over dense data display.
- Must communicate send status clearly (sent/failed/pending) with zero ambiguity.

## 2. Design Direction

### Experience statement
"A calm Sunday bulletin meets a trustworthy utility tool."

### Visual personality
- Warm and pastoral, not church-cliche.
- Editorial and human (voice-first), not corporate SaaS.
- Quietly premium, but frictionless.

### Differentiator
The interface should feel emotionally supportive while handling operational tasks (bulk send, logs, errors) with precision.

## 3. Brand Attributes

- `Warm`: soft neutrals, low harsh contrast surfaces.
- `Hopeful`: sunrise-inspired accents for primary actions.
- `Grounded`: deep ink/forest tones for legibility and trust.
- `Practical`: clear hierarchy, direct actions, predictable behavior.

## 4. Typography System

### Font stack
- Display/Headlines: `Fraunces` (serif with warmth and character)
- UI/Body: `Source Sans 3` (high legibility on mobile)
- Monospace (logs/IDs): `IBM Plex Mono`

### Type scale
- `display-lg`: 42/48, weight 600 (landing hero)
- `display-md`: 34/40, weight 600
- `h1`: 30/36, weight 600
- `h2`: 24/30, weight 600
- `h3`: 20/26, weight 600
- `body-lg`: 18/28, weight 400
- `body`: 16/24, weight 400
- `body-sm`: 14/20, weight 400
- `label`: 13/16, weight 600, +0.02em tracking
- `micro`: 12/16, weight 500

### Type rules
- Default body size is 16px minimum.
- Never use center-aligned long-form text in editors/log views.
- Keep line lengths between 45-75 characters on larger screens.

## 5. Color System

### Core palette
- `linen-50`: `#F9F6EF` (app background)
- `linen-100`: `#F2EBDD` (surface tint)
- `stone-300`: `#D2C7B2` (borders/dividers)
- `ink-900`: `#1D2B2A` (primary text)
- `forest-700`: `#2D4A45` (secondary headings)
- `sunrise-500`: `#D88939` (primary CTA)
- `sunrise-600`: `#BA6F26` (CTA hover/press)
- `sky-500`: `#4D8197` (links/info)
- `success-600`: `#3D7C4B`
- `warning-600`: `#A06A1A`
- `danger-600`: `#A43D3D`

### Semantic tokens
- `bg.canvas`: `linen-50`
- `bg.surface`: `#FFFFFF`
- `bg.muted`: `linen-100`
- `text.primary`: `ink-900`
- `text.secondary`: `#415452`
- `text.inverse`: `#FFFFFF`
- `border.default`: `stone-300`
- `action.primary`: `sunrise-500`
- `action.primary-hover`: `sunrise-600`
- `state.success`: `success-600`
- `state.warning`: `warning-600`
- `state.error`: `danger-600`

### Contrast requirements
- Body text must meet WCAG AA (4.5:1 minimum).
- Large text and iconography must meet at least 3:1.
- Status text should never rely on color only; pair with icon + label.

## 6. Layout and Spacing

### Spacing scale (4pt base)
`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

### Grid and breakpoints
- Mobile-first default width: 320-480px
- `sm`: 480+
- `md`: 768+
- `lg`: 1024+

### Shell
- Sticky top app bar with key context and quick action.
- Primary page content inside padded card sections.
- Bottom safe-area spacing on iOS (`padding-bottom: env(safe-area-inset-bottom)`).

## 7. Shape, Elevation, and Texture

- Radius scale: `8, 12, 16, 24` (cards use 16 by default).
- Borders: soft 1px border + subtle inner highlight for depth.
- Shadows:
  - `shadow-sm`: `0 2px 8px rgba(29,43,42,0.08)`
  - `shadow-md`: `0 8px 24px rgba(29,43,42,0.12)`
- Add subtle paper grain texture at 2-4% opacity to major backgrounds.

## 8. Interaction and Motion

### Motion style
Gentle and deliberate; no playful bouncing.

### Timing tokens
- `fast`: 120ms
- `normal`: 200ms
- `slow`: 320ms
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`

### Key interactions
- Campaign step transitions: slide/fade between stages.
- Buttons: slight lift (`translateY(-1px)`) on hover, reset on press.
- Toasts: bottom-in on mobile, fade-out after timeout.

### Accessibility
Respect `prefers-reduced-motion`; disable transforms and retain opacity-only transitions.

## 9. Component Standards

### Buttons
- Heights: 44px minimum (`48px` for primary CTA).
- Primary: filled `action.primary`, white text.
- Secondary: white background, `forest-700` text, bordered.
- Danger: filled `danger-600`.

### Inputs and textareas
- Min height 44px.
- Label always visible above field.
- Focus ring: 2px `sky-500` + 1px white halo.
- Email editor uses generous line height and quiet background tint.

### Cards
- Use for campaign draft, recipient preview, and logs.
- Header/body/footer structure with consistent 16-20px padding.

### Status chips
- Shapes: pill radius 999px.
- Variants: `Draft`, `Approved`, `Sending`, `Sent`, `Failed`.
- Include icon + text for quick scanning.

### Tables/lists (send logs)
- Mobile: stacked rows with key/value layout.
- Desktop: compact table with sticky header.
- Failed rows get tinted danger background (`danger-50` equivalent).

## 10. Content and Voice in UI

- Use direct, supportive microcopy: "Ready to send to 24 missionaries?"
- Avoid technical jargon on primary actions.
- Error copy should be actionable: what failed, what to do next.
- Keep button labels verb-first: `Generate Draft`, `Approve Campaign`, `Send to Active Missionaries`.

## 11. Screen-Level Guidance

### Campaign creation (`/campaigns/new`)
- One prominent CTA above the fold.
- Topic and notes first; generation controls secondary.
- Show generated blocks as editable cards (Email, WhatsApp, Facebook).

### Approval/send
- Require clear review checkpoint before enabling send.
- Confirmation modal must display recipient count and sender Gmail account.

### Missionaries (`/missionaries`)
- Search + filter by active/inactive as top controls.
- Strong visual distinction for inactive records.

### Style library (`/style-library`)
- Emphasize "upload and trust" workflow.
- Show source labels and tags as calm metadata, not visual noise.

## 12. Iconography and Imagery

- Icon style: rounded-outline, 1.75px stroke, human-friendly geometry.
- Use icons functionally, not decoratively.
- Imagery should be optional and sparse; prioritize text and actions.

## 13. Accessibility Baseline

- Touch target minimum 44x44.
- All controls keyboard reachable.
- Visible focus states on every interactive component.
- Form errors linked via `aria-describedby`.
- Do not use placeholder text as the only label.

## 14. Token Starter (CSS Variables)

```css
:root {
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

  --bg-canvas: #F9F6EF;
  --bg-surface: #FFFFFF;
  --bg-muted: #F2EBDD;

  --text-primary: #1D2B2A;
  --text-secondary: #415452;
  --text-inverse: #FFFFFF;

  --border-default: #D2C7B2;

  --action-primary: #D88939;
  --action-primary-hover: #BA6F26;

  --state-success: #3D7C4B;
  --state-warning: #A06A1A;
  --state-error: #A43D3D;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  --shadow-sm: 0 2px 8px rgba(29, 43, 42, 0.08);
  --shadow-md: 0 8px 24px rgba(29, 43, 42, 0.12);

  --motion-fast: 120ms;
  --motion-normal: 200ms;
  --motion-slow: 320ms;
  --ease-standard: cubic-bezier(0.22, 1, 0.36, 1);
}
```

## 15. Design QA Checklist

- Is the primary Monday flow completable with one thumb on mobile?
- Is the primary CTA always visually dominant?
- Are all statuses explicit (not color-only)?
- Is readability maintained at default iOS zoom levels?
- Do failures provide immediate next actions?

---

This design system is intentionally optimized for the documented MVP: weekly content generation and reliable send operations with warmth, speed, and trust.
