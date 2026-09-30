import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '../components/Navbar';

export const metadata: Metadata = {
  title: 'CodeAtlas — AI-Powered Codebase Intelligence & Change-Impact Analysis',
  description:
    'Search, explore, and analyze the architectural impact of changes across your GitHub repositories using pgvector and grounded LLM intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 min-h-screen flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 font-mono">
          CodeAtlas &bull; Built with Next.js, Express, PostgreSQL, pgvector &amp; OpenAI
        </footer>
      </body>
    </html>
  );
}
