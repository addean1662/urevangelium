import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Urevangelium',
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
      <body className="min-h-screen bg-white text-stone-900">{children}</body>
    </html>
  );
}
