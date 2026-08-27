"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Clock, ChevronLeft, Film } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { PersonCard, PersonCardSkeleton } from "@/components/PersonCard";
import { MovieCard, MovieCardSkeleton } from "@/components/MovieCard";
import type { MovieDetail, ApiError } from "@/types";

export default function MoviePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/movies/${id}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) setError(data);
        else setMovie(data);
      })
      .catch(() => setError({ error: "Network error." }))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <MovieDetailSkeleton />;
  if (error) return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <ErrorState title="Could not load movie" message={error.error} code={error.code} />
    </div>
  );
  if (!movie) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 fade-up">
      {/* Back */}
      <button onClick={() => router.back()} className="btn-ghost mb-6">
        <ChevronLeft size={16} />
        Back
      </button>

      {/* Hero section */}
      <div className="flex flex-col sm:flex-row gap-8 mb-10">
        {/* Poster */}
        <div className="w-full sm:w-48 shrink-0">
          <div className="aspect-[2/3] rounded-xl overflow-hidden bg-surface-elevated border border-surface-border">
            {movie.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={movie.poster} alt={`${movie.title} poster`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                <Film size={40} />
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-3">
            {movie.genres.map((g) => (
              <Link
                key={g}
                href={`/?genre=${encodeURIComponent(g)}`}
                className="badge bg-brand-900/40 text-brand-300 border border-brand-800/40 hover:bg-brand-900/70 transition-colors"
              >
                {g}
              </Link>
            ))}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
            {movie.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
            <span>{movie.year}</span>
            {movie.runtime > 0 && (
              <span className="flex items-center gap-1">
                <Clock size={13} /> {movie.runtime}m
              </span>
            )}
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <Star size={13} fill="currentColor" />
              {movie.rating.toFixed(1)}
            </span>
          </div>

          {movie.plot && (
            <p className="text-gray-300 text-sm leading-relaxed max-w-prose">{movie.plot}</p>
          )}

          {/* Directors */}
          {movie.directors.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Directed by</p>
              <div className="flex flex-wrap gap-2">
                {movie.directors.map((d) => (
                  <Link
                    key={d.id}
                    href={`/people/${d.id}`}
                    className="text-sm font-medium text-brand-300 hover:text-brand-200 transition-colors"
                  >
                    {d.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cast */}
      {movie.actors.length > 0 && (
        <section className="mb-10">
          <h2 className="section-title mb-4">Cast</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {movie.actors.map((a) => (
              <PersonCard
                key={a.id}
                person={a}
                sublabel={a.role ? `as ${a.role}` : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* Similar movies — 2-hop graph result */}
      {movie.similarMovies.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="section-title">You Might Also Like</h2>
          </div>
          <p className="text-muted mb-4">
            Movies sharing 2+ cast members — discovered via a 2-hop graph traversal.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {movie.similarMovies.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MovieDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="skeleton h-8 w-20 rounded-lg mb-6" />
      <div className="flex gap-8 mb-10">
        <div className="w-48 aspect-[2/3] skeleton rounded-xl shrink-0" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="skeleton h-5 w-32 rounded" />
          <div className="skeleton h-8 w-64 rounded" />
          <div className="skeleton h-4 w-40 rounded" />
          <div className="skeleton h-20 w-full rounded" />
        </div>
      </div>
      <div className="skeleton h-6 w-24 rounded mb-4" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => <PersonCardSkeleton key={i} />)}
      </div>
      <div className="skeleton h-6 w-36 rounded mt-8 mb-4" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <MovieCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
