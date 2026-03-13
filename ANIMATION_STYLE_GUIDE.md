# Sister Animation UI Style Guide

This guide captures the look-and-feel and interaction patterns of the current Rays and Waves animation so a sister animation feels intuitively similar.

## 1. Design Intent

- Build a lab-instrument feel: neutral, practical, high-contrast controls over a clean white simulation canvas.
- Keep controls visible but secondary to the simulation area.
- Use soft translucency, moderate borders, and subtle shadows rather than glossy or high-saturation UI.

## 2. Core Visual Language

### 2.1 Typography

- Font stack (use across all UI):
  - system-ui, -apple-system, Segoe UI Variable, Segoe UI, Roboto, Helvetica Neue, Arial, Liberation Sans, Ubuntu, Cantarell, Noto Sans, sans-serif
- Title text:
  - App title: 20px, semibold
  - Secondary title text / author tag: 14px, semibold
- Controls:
  - Buttons and select: 13px
  - Slider labels: 12px, semibold
  - Value readouts: 12px with tabular numerals

### 2.2 Color and Surface Tokens

- Workspace background: #e5e5e5
- Canvas surface: #ffffff (or #000000 when inverted mode)
- Primary border: #9e9e9e (2px on key chrome)
- Soft card border: #e0e3e8 (1px)
- Focus ring: #4a90e2
- Neutral text:
  - primary: #333
  - stronger button text: #222
- Floating panel backgrounds:
  - title bar: rgba(255,255,255,0.95)
  - wave panel: rgba(255,255,255,0.75)
  - component panel header/tab: rgba(255,255,255,0.9)
- Shadows:
  - light float: 0 2px 8px rgba(0,0,0,0.15)
  - menu float: -4px 4px 16px rgba(0,0,0,0.2) or 0 -4px 16px rgba(0,0,0,0.2)

### 2.3 Shape Language

- Radius standard: 8px for bars, cards, floating menus.
- Buttons/inputs: 4px to 6px radius.
- Circular interaction handles use 8px to 10px radii.

## 3. Layout Architecture

### 3.1 Global Layout

- Full viewport app, no body scrolling.
- Canvas container fills remaining screen and acts as positioning context for overlays.
- Main overlays are absolute positioned:
  - top title bar
  - right wave menu + right-edge toggle
  - bottom component menu + center-bottom toggle

### 3.2 Title Bar

- Position: absolute, centered at top (8px top inset).
- Width: about 97.5% with max width tied to component-card grid width.
- Visual treatment:
  - translucent white panel
  - 2px neutral border
  - 8px radius
  - light shadow
  - optional backdrop blur (8px)
- Internal structure:
  - 3-zone row: left title, centered controls, right metadata
  - center contains Save/Load, preset select, Pause, Reset
- Responsive behavior:
  - switch to two-row arrangement when center controls need extra space

### 3.3 Canvas and Grid Context

- Canvas should always be visible and interactive beneath overlays.
- Use a single pixel border around the canvas.
- Maintain a pre-rendered grid layer for performance and stability.

## 4. Control Styling

### 4.1 Buttons

- Default style:
  - 8px x 14px internal padding
  - 13px semibold text
  - subtle border and neutral gradient fill
- Hover:
  - slightly brighter background
  - slightly stronger border
  - slightly larger shadow
- Active:
  - pressed gradient + inset shadow
- Focus:
  - visible 2px blue outline

### 4.2 Select and Readout Chips

- Preset select:
  - compact (6px x 10px)
  - neutral fill (#f0f0f0)
  - 1px border
- Value readouts (.val):
  - right-aligned
  - min width around 70-75px
  - soft panel fill (#f5f7fa)
  - editable appearance with clear focus state

### 4.3 Slider and Toggle Rows

- Stack controls vertically in side menu with 12px group spacing.
- Use compact labels and keep sliders full-width.
- Use checkbox rows with label left, control right.
- Radio groups should remain horizontally compact and no-wrap.

## 5. Side and Bottom Menus

### 5.1 Wave Side Menu (Right)

- Toggle button docked to right edge:
  - 50x50
  - rounded left corners only
  - no right border so it appears fused to viewport edge
- Panel style:
  - right-anchored translucent card
  - width around 205px
  - max height constrained to viewport
  - vertical scroll with custom scrollbar styling
- Open/close motion:
  - fade + small horizontal translation
  - hide toggle while panel is open
- Header includes title and a large collapse chevron.

### 5.2 Bottom Component Menu

- Toggle button centered at bottom edge:
  - tab-like shape with top corners rounded
  - border without bottom edge
- Expanded panel:
  - spans left-to-right at bottom
  - top border + upward shadow
  - translucent background
  - has a floating header tab centered above panel
- Open/close motion:
  - fade + small vertical translation
  - hide toggle while panel is open

### 5.3 Scrollbars

- Use subtle custom scrollbars on side and bottom menus:
  - track very light transparent gray
  - thumb medium transparent gray
  - darker thumb on hover

## 6. Component Cards and Selection

- Cards are white, borderless, slightly elevated blocks.
- Card dimensions:
  - min width around 320px desktop, reducing to about 260px on smaller layouts
- Grid behavior:
  - 3 columns desktop
  - 2 columns below ~900px
  - 1 column below ~600px
- Each card has a colored accent via shadow tone to match its optical element group.
- Selector bar above cards includes checkbox selectors with colored bottom accents.

## 7. Handle Design System

### 7.1 Handle Families

- Rotation handles:
  - radius 10px
  - circle with stroke + curved arrow glyph
- Stretch handles:
  - radius 8px
  - circle; prism apex handle adds vertical double-arrow icon
- Focal length handles:
  - radius 8px
  - circle; optional axis-aligned double-arrow when highlighted
- Focal points (small indicators):
  - ~3px filled dots in distinct per-element colors

### 7.2 Handle Colors

- Idle handle fill: rgba(200,200,200,0.8)
- Active/drag fill: rgba(100,255,100,0.9)
- Handle stroke: rgba(0,0,0,0.6)
- Icon stroke/fill: rgba(0,0,0,0.8)
- Inverted mode exception: icon/stroke may switch to white for readability.

### 7.3 Handle Visibility Rules

- Handles are not permanently visible.
- Show handles when any of these are true:
  - object is hovered
  - handle is hovered
  - object is being dragged/edited
  - related handle family is active
  - touch reveal timer is active
- Touch reveal behavior:
  - keep handles visible for about 1200ms after release
  - brief extension while dragging (~250ms refresh cadence)

## 8. Interaction Behavior That Feels Similar

### 8.1 Pointer and Cursor

- Cursor states:
  - default when not interactive
  - grab over draggable objects and handles
- Use pointer capture during drag operations and release cleanly on pointerup/cancel.

### 8.2 Drag Modes

- Keep drag modes mutually exclusive with explicit flags:
  - object drag
  - rotation drag
  - stretch drag
  - focal drag
  - source drag
  - direction-arrow drag
  - pan drag

### 8.3 Snapping

- Position snap:
  - x snapping to 0.5 cm increments for moved components
  - source y snapping to optical axis when near threshold
- Direction snap:
  - gentle snapping near cardinal directions (0/90/180/270)
- Modifier bypass:
  - Alt disables snap behavior for precision placement.

### 8.4 Zoom and Pan

- Mouse wheel zoom with clamped zoom range.
- Touch pinch zoom with deadzone to reduce jitter.
- Keep zoom centered around interaction midpoint for natural feel.

## 9. Motion and Transition Guidelines

- Keep transitions short and functional (about 0.2s to 0.3s).
- Avoid decorative animation; use only state-change transitions:
  - panel open/close
  - button hover/active feedback
  - menu toggle visibility

## 10. Accessibility and Readability

- Ensure all icon-only buttons have title and aria-label.
- Preserve visible focus outlines for keyboard users.
- Maintain contrast in normal and inverted modes.
- Keep labels short and predictable; prioritize familiar wording.

## 11. Implementation Checklist for Sister Animation

- Recreate overlay structure: top bar + right wave menu + bottom component menu.
- Keep same spacing rhythm: 4/8/12/16px progression.
- Preserve neutral color language and translucent panels.
- Reuse handle families, states, and reveal-on-touch behavior.
- Use the same cursor and snapping conventions.
- Keep button/select/readout visual treatment consistent.
- Keep responsive breakpoints for card grid and title bar wrapping.

## 12. Optional: Define CSS Tokens Up Front

Use these as a starting token set to keep UI consistency:

- --ui-bg-workspace: #e5e5e5
- --ui-bg-panel: rgba(255,255,255,0.95)
- --ui-bg-panel-soft: rgba(255,255,255,0.75)
- --ui-border-strong: #9e9e9e
- --ui-border-soft: #e0e3e8
- --ui-radius: 8px
- --ui-shadow: 0 2px 8px rgba(0,0,0,0.15)
- --ui-shadow-menu: 0 -4px 16px rgba(0,0,0,0.2)
- --ui-focus: #4a90e2

If the sister animation follows this spec, users should immediately perceive it as part of the same product family while still allowing different physics/content behavior.
