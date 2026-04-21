import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
});

import { GameProvider } from '@/components/GameContext';

export const metadata: Metadata = {
  title: 'MythosForge | D&D Character Sheet & AI Companion',
  description: 'A comprehensive D&D 5e character manager featuring AI-generated backstories, portraits, and integrated dice rolling.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${playfair.variable}`}>
      <body suppressHydrationWarning className="bg-[var(--deep-slate)] text-[var(--parchment)] min-h-screen font-sans">
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
