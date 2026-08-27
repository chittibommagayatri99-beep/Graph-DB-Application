"use client";

import { useEffect, useState, useCallback } from "react";
import { MovieCard, MovieCardSkeleton } from "@/components/MovieCard";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { ChevronLeft, ChevronRight, Film, Star, Users, GitFork, Layers } from "lucide-react";
import type { Movie, Genre, ApiError } from "@/types";
import clsx from "clsx";

const LIMIT = 20;

interface MoviesResponse {
  movies: Movie[];
  total: number;
  genres: Genre[];
}

interface StatsResponse {
  movies: number;
  people: number;
  relationships: number;
  genres: number;
}

export default function HomePage() {
  const [data, setData] = useState<MoviesResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [genre, setGenre] = useState<string | undefined>();
  const [page, setPage] = useState(0);

  const fetchMovies = useCallback(async (g?: string, p = 0) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ skip: String(p * LIMIT), limit: String(LIMIT) });
      if (g) params.set("genre", g);
      const res = await fetch(`/api/movies?${params}`);
      const json = await res.json();
      if (!res.ok) { setError(json); return; }
      setData(json);
    } catch {
      setError({ error: "Network error — could not reach the server." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovies(genre, page);
  }, [fetchMovies, genre, page]);

  // Fetch stats once
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => {
        if (!r.ok) return; // silently skip on error
        return r.json().then(setStats);
      })
      .catch(() => {/* silently ignore stats failure */});
  }, []);

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;

  const handleGenre = (g: string | undefined) => {
    setGenre(g);
    setPage(0);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Explore the Movie Graph
        </h1>
        <p className="text-muted max-w-2xl">
          Discover connections between films, actors, and directors. Every relationship
          is a traversal — not a join.
        </p>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 fade-up">
          {[
            { label: "Movies", value: stats.movies, icon: Film, color: "text-brand-400" },
            { label: "People", value: stats.people, icon: Users, color: "text-blue-400" },
            { label: "Relationships", value: stats.relationships, icon: GitFork, color: "text-green-400" },
            { label: "Genres", value: stats.genres, icon: Layers, color: "text-amber-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4 flex items-center gap-3">
              <Icon size={20} className={color} />
              <div>
                <p className="text-xl font-bold text-white">{value.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Genre filters */}
      {data?.genres && data.genres.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => handleGenre(undefined)}
            className={clsx(
              "badge px-3 py-1 text-xs font-medium border transition-colors",
              !genre
                ? "bg-brand-700 border-brand-500 text-white"
                : "bg-surface-elevated border-surface-border text-gray-400 hover:text-white hover:border-gray-500"
            )}
          >
            All
          </button>
          {data.genres.map((g) => (
            <button
              key={g.name}
              onClick={() => handleGenre(g.name)}
              className={clsx(
                "badge px-3 py-1 text-xs font-medium border transition-colors",
                genre === g.name
                  ? "bg-brand-700 border-brand-500 text-white"
                  : "bg-surface-elevated border-surface-border text-gray-400 hover:text-white hover:border-gray-500"
              )}
            >
              {g.name} <span className="ml-1 opacity-60">{g.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {error ? (
        <ErrorState
          title="Could not load movies"
          message={error.error}
          code={error.code}
        />
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      ) : data?.movies.length === 0 ? (
        <EmptyState
          title="No movies found"
          message={genre ? `No movies in the "${genre}" genre.` : "The database appears to be empty. Run the seed script to populate it."}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 fade-up">
            {data!.movies.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-ghost"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
                Prev
              </button>
              <span className="text-sm text-gray-400">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn-ghost"
                aria-label="Next page"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
