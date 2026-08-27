"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Film, User, X } from "lucide-react";
import clsx from "clsx";
import type { SearchResult } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        open ? onClose() : undefined;
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
        setActiveIdx(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 280);
  };

  const navigate = (result: SearchResult) => {
    router.push(`/${result.type === "movie" ? "movies" : "people"}/${result.id}`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIdx]) {
      navigate(results[activeIdx]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg fade-up">
        <div className="card overflow-hidden shadow-2xl shadow-black/50">
          {/* Input row */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border">
            <Search size={16} className="text-gray-500 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Search movies and people…"
              className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
              aria-autocomplete="list"
              aria-controls="search-results"
            />
            {loading && (
              <span className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Results */}
          <div id="search-results" role="listbox">
            {results.length === 0 && query.trim() && !loading && (
              <p className="px-4 py-8 text-center text-muted">No results for "{query}"</p>
            )}
            {results.length === 0 && !query.trim() && (
              <p className="px-4 py-8 text-center text-muted">
                Start typing to search movies and people
              </p>
            )}
            {results.map((r, i) => (
              <button
                key={r.id}
                role="option"
                aria-selected={i === activeIdx}
                onClick={() => navigate(r)}
                onMouseEnter={() => setActiveIdx(i)}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  i === activeIdx ? "bg-surface-elevated" : "hover:bg-surface-elevated"
                )}
              >
                {/* Thumbnail */}
                <div className="w-8 h-8 rounded bg-surface-elevated border border-surface-border overflow-hidden shrink-0 flex items-center justify-center">
                  {r.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image} alt="" className="w-full h-full object-cover" />
                  ) : r.type === "movie" ? (
                    <Film size={14} className="text-gray-600" />
                  ) : (
                    <User size={14} className="text-gray-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{r.label}</p>
                  <p className="text-xs text-gray-500 truncate">{r.sublabel}</p>
                </div>

                <span
                  className={clsx(
                    "badge text-xs shrink-0",
                    r.type === "movie"
                      ? "bg-brand-900/50 text-brand-300"
                      : "bg-blue-900/40 text-blue-300"
                  )}
                >
                  {r.type === "movie" ? "Film" : "Person"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
