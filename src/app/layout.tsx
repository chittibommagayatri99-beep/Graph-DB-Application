import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "CineGraph — Movie Relationship Explorer",
  description:
    "Explore connections between movies, actors, and directors using a graph database. Discover collaborations, find hidden paths, and browse your favourite films.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Navbar />
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
        <footer className="border-t border-surface-border py-6 text-center text-xs text-gray-600">
          CineGraph · Powered by{" "}
          <a
            href="https://console.cognodb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-400 transition-colors"
          >
            CognoDB
          </a>
        </footer>
      </body>
    </html>
  );
}
