import type { Metadata } from 'next';
import './globals.css';

const inter = { variable: '--font-sans' };
const jetbrainsMono = { variable: '--font-mono' };
const playfair = { variable: '--font-serif' };

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
