import Link from "next/link";
import { User } from "lucide-react";
import clsx from "clsx";
import type { Person } from "@/types";

interface Props {
  person: Person;
  sublabel?: string;
  className?: string;
}

export function PersonCard({ person, sublabel, className }: Props) {
  return (
    <Link
      href={`/people/${person.id}`}
      className={clsx("card-hover flex items-center gap-3 p-3", className)}
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-elevated border border-surface-border shrink-0">
        {person.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.photo}
            alt={person.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <User size={20} />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="font-medium text-sm text-white truncate">{person.name}</p>
        <p className="text-xs text-gray-500 truncate">
          {sublabel ?? (person.born ? `Born ${person.born}` : "")}
        </p>
      </div>
    </Link>
  );
}

export function PersonCardSkeleton() {
  return (
    <div className="card flex items-center gap-3 p-3">
      <div className="w-12 h-12 rounded-full skeleton shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
    </div>
  );
}
