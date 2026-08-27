import Link from "next/link";
import { Star, Clock } from "lucide-react";
import clsx from "clsx";
import type { Movie } from "@/types";

interface Props {
  movie: Movie;
  className?: string;
}

export function MovieCard({ movie, className }: Props) {
  return (
    <Link href={`/movies/${movie.id}`} className={clsx("card-hover group block", className)}>
      {/* Poster */}
      <div className="relative aspect-[2/3] rounded-t-xl overflow-hidden bg-surface-elevated">
        {movie.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={movie.poster}
            alt={`${movie.title} poster`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <span className="text-4xl">🎬</span>
          </div>
        )}

        {/* Rating badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm
                        rounded-full px-2 py-0.5 text-xs font-semibold text-amber-400">
          <Star size={10} fill="currentColor" />
          {movie.rating.toFixed(1)}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm text-white leading-snug line-clamp-2 mb-1">
          {movie.title}
        </h3>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{movie.year}</span>
          {movie.runtime > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {movie.runtime}m
            </span>
          )}
        </div>
        {/* Genres */}
        {movie.genres && movie.genres.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {movie.genres.slice(0, 2).map((g) => (
              <span key={g} className="badge bg-surface text-gray-400 border border-surface-border">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

/** Loading skeleton for MovieCard */
export function MovieCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[2/3] skeleton" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
    </div>
  );
}
