"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { PersonCard, PersonCardSkeleton } from "@/components/PersonCard";
import type { Person, ApiError } from "@/types";

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/people")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) setError(d);
        else setPeople(d.people ?? []);
      })
      .catch(() => setError({ error: "Network error." }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">People</h1>
        <p className="text-muted">Actors and directors in the graph.</p>
      </div>

      {error ? (
        <ErrorState title="Could not load people" message={error.error} code={error.code} />
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => <PersonCardSkeleton key={i} />)}
        </div>
      ) : people.length === 0 ? (
        <EmptyState
          icon={<User size={28} className="text-gray-600" />}
          title="No people found"
          message="Run the seed script to populate the database."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 fade-up">
          {people.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      )}
    </div>
  );
}
