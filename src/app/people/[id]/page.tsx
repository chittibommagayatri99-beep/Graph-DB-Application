"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, User, Film, Users } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { MovieCard, MovieCardSkeleton } from "@/components/MovieCard";
import { PersonCard, PersonCardSkeleton } from "@/components/PersonCard";
import type { PersonDetail, ApiError } from "@/types";

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/people/${id}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) setError(data);
        else setPerson(data);
      })
      .catch(() => setError({ error: "Network error." }))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PersonDetailSkeleton />;
  if (error) return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <ErrorState title="Could not load person" message={error.error} code={error.code} />
    </div>
  );
  if (!person) return null;

  const totalCredits = person.actedInMovies.length + person.directedMovies.length;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 fade-up">
      <button onClick={() => router.back()} className="btn-ghost mb-6">
        <ChevronLeft size={16} /> Back
      </button>

      {/* Profile header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-10">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-surface-elevated border-2 border-surface-border shrink-0">
          {person.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.photo} alt={person.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">
              <User size={36} />
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{person.name}</h1>
          {person.born && (
            <p className="text-sm text-gray-500 mb-3">Born {person.born}</p>
          )}

          <div className="flex flex-wrap gap-3 mb-4">
            {person.actedInMovies.length > 0 && (
              <span className="badge bg-surface-elevated border border-surface-border text-gray-300">
                <Film size={12} className="mr-1" />
                {person.actedInMovies.length} film{person.actedInMovies.length !== 1 ? "s" : ""} as actor
              </span>
            )}
            {person.directedMovies.length > 0 && (
              <span className="badge bg-surface-elevated border border-surface-border text-gray-300">
                🎬 {person.directedMovies.length} film{person.directedMovies.length !== 1 ? "s" : ""} directed
              </span>
            )}
          </div>

          {person.bio && (
            <p className="text-gray-300 text-sm leading-relaxed max-w-prose">{person.bio}</p>
          )}
        </div>
      </div>

      {/* Acting credits */}
      {person.actedInMovies.length > 0 && (
        <section className="mb-10">
          <h2 className="section-title mb-4">Acting Credits</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {person.actedInMovies.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </section>
      )}

      {/* Directed */}
      {person.directedMovies.length > 0 && (
        <section className="mb-10">
          <h2 className="section-title mb-4">Directed</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {person.directedMovies.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </section>
      )}

      {/* Collaborators */}
      {person.collaborators.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="section-title">Frequent Collaborators</h2>
          </div>
          <p className="text-muted mb-4">
            People {person.name.split(" ")[0]} has worked with most — found via graph traversal.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {person.collaborators.map((c) => (
              <PersonCard
                key={c.id}
                person={c}
                sublabel={`${c.sharedMovies} shared film${c.sharedMovies !== 1 ? "s" : ""}`}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PersonDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="skeleton h-8 w-20 rounded-lg mb-6" />
      <div className="flex gap-6 mb-10">
        <div className="w-32 h-32 rounded-full skeleton shrink-0" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="skeleton h-8 w-48 rounded" />
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-16 w-full rounded" />
        </div>
      </div>
      <div className="skeleton h-6 w-36 rounded mb-4" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <MovieCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
