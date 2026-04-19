import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import AppHeader from '@/components/AppHeader';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'UK NPM Food Scoring',
  description: 'Nutrient Profiling Model (2004/2005) — HFSS Classification',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')})()`,
          }}
        />
      </head>
      <body className="min-h-screen font-sans">
        <AppHeader />
        <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
