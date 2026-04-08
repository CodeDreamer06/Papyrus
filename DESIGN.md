# Design System

## Overview
Papyrus is an app that helps students create quizzes from PDFs with a visual identity that is local-first, professional, and high-tech. The interface uses a deep dark theme that conveys a sense of high-performance computing. Layout is moderately dense, characterized by a dual-pane desktop application simulation and functional grids. The personality is minimalist but accented with warm, high-contrast gold/amber glows, creating a "terminal-at-night" or "luxury-studio" aesthetic. Motion cues include soft fade-ins and subtle hero glows.

## Colors
### Palette Roles
- **Background**: `#0a0a09` (Deep near-black neutral)
- **Foreground/Base Text**: `#fcfcfc` (High contrast off-white)
- **Muted Foreground**: `#737373` (Mid-grey for secondary text)
- **Primary/Accent**: `#cca133` (Gold/Amber highlight used for key actions and icons)
- **Accent Faint**: `#ccad5c` (Lightened gold for hover states)
- **Accent Deep**: `#8f7026` (Darker gold for depth and glow boundaries)
- **Border**: `#333333` (Subtle dark grey for structural separation)
- **App Box**: `#1a1a17` (Dark neutral container for application frames)
- **Sidebar**: `#080807` (Deepest shade for vertical navigation components)

## Typography
- **Primary Sans-Serif**: UI Sans system stack (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`) for optimal legibility.
- **Handwritten Accent**: 'Caveat' font family, used for playful annotations like "try me!" (Size: `20px`).
- **Monospace**: `ui-monospace` for metadata and timestamps.
- **Headings**: 
  - Hero: `text-5xl` to `text-8xl` (48px to 96px), bold, tracking-tighter.
  - Section: `text-3xl` to `text-4xl` (30px to 36px), semibold.
- **Body Text**: `text-base` (16px) for main descriptions, `text-sm` (14px) for component descriptions, `text-xs` (12px) for tertiary metadata.

## Elevation
- **Shadows**: Heavy, diffused shadows for the application frame: `0 25px 60px rgba(0,0,0,0.5)`. 
- **Accent Elevation**: Buttons use a layered shadow-and-inset effect: `shadow-[0_4px_20px_hsl(43_60%_50%/0.3),inset_0_2px_0_rgba(255,255,255,0.2),inset_0_-2px_0_rgba(0,0,0,0.1)]`.
- **Glass/Translucency**: Extensive use of `backdrop-blur-xl` and `backdrop-blur-2xl` on fixed navigation bars and modal-like generator inputs.
- **Layering**: High reliance on border separation (`border-app-line`) rather than deep color shifts.

## Components
- **Simulated App Frame**: A dual-pane layout featuring a thin 64px sidebar, a list of "Voice Cards," and a split right-side list view for generation history.
- **Voice Cards**: Rounded-xl containers (`1.5rem`) with 2px borders (highlighted in accent gold for the selected state).
- **Generator Input**: A floating input bar anchored at the bottom with high translucency, containing tag-style pills for language and model settings.
- **Action Buttons**: 
  - Primary: Rounded-full, uppercase, gold background with white text and inner bevels.
  - Secondary/GitHub: Rounded-full, bordered, with glass background and monochromatic icons.
- **Feature Tiles**: Dark grid items with top-aligned accent icons and concise vertical stack: Icon -> Heading -> Paragraph.

## Do's and Don'ts
- **Do**: Use high-contrast accents (Gold) sparingly against the near-black background.
- **Do**: Maintain generous border-radii (`radius-lg` and `radius-xl`) for a modern hardware-software feel.
- **Don't**: Use pure blacks (#000) for containers; use the slightly lifted `#1a1a17` for better shadow definition.
- **Don't**: Use standard blue links; links should be white or gold-accented on hover.
- **Do**: Use backdrop blur for all fixed or overlaying elements to preserve depth.

## Assets
- **Other**: https://fonts.googleapis.com/css2?family=Caveat:wght@400;500&amp;display=swap — contexts: link[rel="preload"]
- **Font**: https://fonts.gstatic.com/s/caveat/v23/WnznHAc5bAfYB2QRah7pcpNvOx-pjcB9SII.ttf — contexts: css url()
- **Font**: https://fonts.gstatic.com/s/caveat/v23/WnznHAc5bAfYB2QRah7pcpNvOx-pjfJ9SII.ttf — contexts: css url()