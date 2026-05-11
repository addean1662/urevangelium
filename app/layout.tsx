import type { Metadata } from 'next';
import './globals.css';
import '@fontsource/noto-sans-syriac/400.css';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Urevangelium — The Gospels across their earliest witnesses',
  description:
    'Word-by-word alignment of the four Gospels across six manuscript witnesses: Earliest Papyrus, Vaticanus, Sinaiticus, Vulgate, Peshitta, Byzantine.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-bg-page text-ink-primary">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
