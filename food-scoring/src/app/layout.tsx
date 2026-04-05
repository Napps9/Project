import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UK NPM Food Scoring',
  description: 'Nutrient Profiling Model (2004/2005) — HFSS Classification',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
