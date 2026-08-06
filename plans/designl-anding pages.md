# Design EXISEL

<!-- Letakkan panduan warna, tipografi, spacing, komponen, dan gaya visual EXISEL di file ini. -->
---
name: EXISEL Visual Language
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#434656'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#747687'
  outline-variant: '#c4c5d8'
  surface-tint: '#0f4ceb'
  primary: '#003ece'
  on-primary: '#ffffff'
  primary-container: '#2457f5'
  on-primary-container: '#e4e6ff'
  inverse-primary: '#b8c4ff'
  secondary: '#994700'
  on-secondary: '#ffffff'
  secondary-container: '#fb7800'
  on-secondary-container: '#592600'
  tertiary: '#515050'
  on-tertiary: '#ffffff'
  tertiary-container: '#696868'
  on-tertiary-container: '#ebe8e7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#0037b9'
  secondary-fixed: '#ffdbc8'
  secondary-fixed-dim: '#ffb68b'
  on-secondary-fixed: '#321200'
  on-secondary-fixed-variant: '#753400'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474646'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-md:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  title-lg:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1.6'
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.4'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is built on **Neo-Brutalism**, capturing the raw energy and ambition of Indonesian vocational students. It rejects subtle gradients and soft shadows in favor of high-contrast layouts, thick borders, and hard-edged shapes. The visual personality is loud, confident, and structured—mimicking the functional yet vibrant nature of technical workshops and creative extracurriculars.

The target audience is Gen-Z students who value speed, clarity, and a "straight-to-the-point" digital experience. By using exaggerated UI metaphors like offset shadows and vibrant fills, the interface feels tactile and physically present, encouraging active engagement with school programs.

## Colors
The palette is dominated by **Electric Blue** for primary actions and **Bright Orange** for accents and highlights, creating a high-energy "clash" that signifies activity. 

- **Primary & Secondary:** Use these for the "top-tier" layers (e.g., active cards, primary buttons).
- **Subtle Surfaces:** Use Light Blue and Light Orange for background containers or hover states to maintain color harmony without overwhelming the eye.
- **Ink & Stroke:** All borders, text, and iconography must use the Near-black (#111111) to maintain the "comic-book" structural integrity of the design system.
- **Semantic:** Success and Error colors should still retain a 3px black border to stay consistent with the brand style.

## Typography
Typography is the primary driver of the "Brutalist" feel. 
- **Headlines:** Use **Space Grotesk** with heavy weights (Bold/Black). Tighten the letter spacing for large display text to create a more impactful, "poster-like" look.
- **Body:** **Manrope** provides a modern, legible contrast. Use Medium weight (500) as the base for body text to ensure it stands up against the heavy borders.
- **Language:** All copy should be in Bahasa Indonesia, utilizing an active and encouraging voice (e.g., "Daftar Sekarang", "Lihat Jadwal").

## Layout & Spacing
The layout follows a **Rigid Grid** philosophy. Elements should feel "locked" into place.
- **Desktop:** 12-column grid with generous 40px margins.
- **Mobile:** 4-column grid with 16px margins.
- **Rhythm:** All spacing (padding/margins) must be multiples of 4px. Use larger gaps (stack-lg) between distinct sections to allow the heavy borders room to breathe without the UI feeling cluttered.
- **Reflow:** Cards should stack vertically on mobile but can expand to span 4 or 6 columns on desktop depending on content density.

## Elevation & Depth
In this design system, depth is **Hard and 2D**, not soft and 3D.
- **Shadows:** Use "Hard Offset Shadows" instead of blurs. A typical shadow is a solid block of Near-black (#111111) offset by 4px to 8px on the X and Y axis.
- **Borders:** Every container, button, and input field must have a solid 3px or 4px black outline. 
- **Z-Index:** To show hierarchy, increase the offset of the hard shadow. For example, a resting card has a 4px shadow; a hovered card "lifts" to an 8px shadow.
- **No Blurs:** The use of Gaussian blurs or soft drop shadows is strictly prohibited.

## Shapes
Shapes are predominantly rectangular to maintain a technical, "vocational" feel. 
- **Radius:** A consistent 8px (`rounded-lg`) is used for primary cards and buttons to prevent the UI from feeling too aggressive or sharp for students.
- **Interactions:** When an element is clicked/pressed, it should translate (move) to "fill" its shadow, creating a tactile "push-button" effect.

## Components
- **Buttons:** Large, 4px black border, 4px hard shadow. Text must be Bold. Primary buttons use Electric Blue; Secondary buttons use White or Bright Orange. On click, the button moves 4px down and right to overlap the shadow.
- **Cards:** White or Light Blue background with a 4px black border and 8px hard shadow. Headlines inside cards should always be Space Grotesk.
- **Input Fields:** 3px black border, White background. On focus, the background changes to Light Blue or the border thickens to 5px.
- **Chips/Badges:** Use a 2px border and a 0px shadow. These are the only elements that can use a "pill" shape to distinguish them from actionable buttons.
- **Lists:** Items separated by a 3px horizontal black line. Use "Right Arrow" icons in 111111 for navigation.
- **Navigation:** A thick black bottom border for the header. Active links are highlighted with an Orange underline or an Orange background "box" with a 2px border.