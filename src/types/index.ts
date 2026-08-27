// ─── Domain Types ────────────────────────────────────────────────────────────

export interface Movie {
  id: string;
  title: string;
  year: number;
  rating: number;
  runtime: number; // minutes
  plot: string;
  poster: string; // URL
  genres: string[];
}

export interface Person {
  id: string;
  name: string;
  born: number; // birth year
  bio: string;
  photo: string; // URL
}

export interface Genre {
  name: string;
  count: number;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface MovieDetail extends Movie {
  directors: Person[];
  actors: Array<Person & { role: string }>;
  similarMovies: Movie[];
}

export interface PersonDetail extends Person {
  directedMovies: Movie[];
  actedInMovies: Array<Movie & { role: string }>;
  collaborators: Array<Person & { sharedMovies: number }>;
}

/** A path node in an actor connection path */
export interface PathNode {
  type: "person" | "movie";
  id: string;
  label: string;
  sublabel?: string; // role or year
}

export interface ConnectionPath {
  nodes: PathNode[];
  hops: number;
}

export interface SearchResult {
  id: string;
  type: "movie" | "person";
  label: string;
  sublabel: string;
  image: string;
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  code?: string;
}
