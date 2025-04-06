'use client'

import * as React from "react"
import { Moon, Sun, Palette } from "lucide-react" // Added Palette icon
import { useTheme } from "next-themes"
import { availableThemes } from "@/components/providers/theme-provider" // Import defined themes

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export function ThemeSwitcher() {
  const { setTheme, theme, resolvedTheme } = useTheme()

  // Get the base theme name (remove .dark if present)
  const currentBaseTheme = theme?.startsWith('dark-') ? theme.substring(5) : theme;

  const handleThemeChange = (newTheme: string) => {
     // If system/light/dark are selected, use them directly
     if (['system', 'light', 'dark'].includes(newTheme)) {
        setTheme(newTheme);
     } else {
         // For named themes (zinc, rose, etc.), apply them.
         // next-themes will handle adding the .dark class based on system/user preference.
         // We set the theme name directly (e.g., "rose")
         setTheme(newTheme);
     }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          {/* Show Palette icon as trigger */} 
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          {/* Fallback icons (optional) 
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          */}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleThemeChange('light')}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange('system')}>
          System
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Color Theme</DropdownMenuLabel>
         {availableThemes.map((themeName) => (
          <DropdownMenuItem 
            key={themeName} 
            onClick={() => handleThemeChange(themeName)}
            // Indicate current theme
            className={currentBaseTheme === themeName ? "bg-accent" : ""}
          >
            {themeName.charAt(0).toUpperCase() + themeName.slice(1)} {/* Capitalize */} 
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 