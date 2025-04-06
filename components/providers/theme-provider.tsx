"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { type ThemeProviderProps } from "next-themes"

// Define available themes (match class names in globals.css)
// "system" is handled by next-themes, "light"/"dark" map to :root/.dark
// We can map "zinc" to the default :root/.dark styles
export const availableThemes = ["zinc", "rose", "blue", "green"];

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
     <NextThemesProvider 
        attribute="class" 
        // defaultTheme="system" // Let next-themes handle system pref initially
        // enableSystem 
        // disableTransitionOnChange // Keep transitions for theme changes
        // Pass themes list if needed, but we manage the class switching manually below
        {...props} // Pass other props like storageKey
      >
        {children}
      </NextThemesProvider>
   );
}

// Optional: Hook to manage theme class on body/html if needed beyond next-themes default
// next-themes should handle adding the .dark class and the specific theme class 
// IF the theme value matches the class name (e.g., setTheme('theme-rose')).
// Let's simplify and assume next-themes handles adding `.theme-rose` to <html> when theme is set to `theme-rose`
// We just need a way to set the theme in next-themes. 