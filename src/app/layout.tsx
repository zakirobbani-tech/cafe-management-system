import './globals.css';
import type { Metadata, Viewport } from 'next';
export const metadata: Metadata = { title: 'PLACE #1 – Cafe Management System' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="id"><body>{children}</body></html>);
}
