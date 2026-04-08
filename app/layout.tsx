import type { Metadata } from "next";
import "./globals.css";
import { MathProvider } from "@/components/math-provider";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Papyrus AI - Interactive Quiz Generator",
  description:
    "Transform PDFs into interactive quizzes with AI-powered question generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <MathProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </MathProvider>
      </body>
    </html>
  );
}
