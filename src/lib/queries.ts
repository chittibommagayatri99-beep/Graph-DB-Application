/**
 * All Cypher queries are parameterised through the official Neo4j driver.
 * No string interpolation of user input — ever.
 */

import { getReadSession, toNumber } from "./neo4j";
import type {
  Movie,
  MovieDetail,
  Person,
  PersonDetail,
  Genre,
  SearchResult,
  ConnectionPath,
  PathNode,
} from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapMovie(m: Record<string, unknown>): Movie {
  return {
    id: m.id as string,
    title: m.title as string,
    year: toNumber(m.year),
    rating: Number((m.rating as number).toFixed(1)),
    runtime: toNumber(m.runtime),
    plot: m.plot as string,
    poster: m.poster as string,
    genres: (m.genres as string[]) ?? [],
  };
}

function mapPerson(p: Record<string, unknown>): Person {
  return {
    id: p.id as string,
    name: p.name as string,
    born: toNumber(p.born),
    bio: p.bio as string,
    photo: p.photo as string,
  };
}

// ─── Browse / Listing ─────────────────────────────────────────────────────────

/**
 * Returns paginated movies, optionally filtered by genre.
 * Sorted by rating descending.
 */
export async function listMovies(opts: {
  genre?: string;
  skip?: number;
  limit?: number;
}): Promise<{ movies: Movie[]; total: number }> {
  const session = getReadSession();
  try {
    const skip = opts.skip ?? 0;
    const limit = opts.limit ?? 20;

    // Run count and page queries separately — openCypher does not support
    // window functions (count(*) OVER ()).
    if (opts.genre) {
      const countResult = await session.run(
        `
        MATCH (m:Movie)-[:HAS_GENRE]->(g:Genre {name: $genre})
        RETURN count(DISTINCT m) AS total
        `,
        { genre: opts.genre }
      );
      const total = toNumber(countResult.records[0]?.get("total") ?? 0);

      const result = await session.run(
        `
        MATCH (m:Movie)-[:HAS_GENRE]->(g:Genre {name: $genre})
        WITH DISTINCT m,
             [(m)-[:HAS_GENRE]->(g2:Genre) | g2.name] AS genres
        RETURN m { .id, .title, .year, .rating, .runtime, .plot, .poster, genres: genres } AS movie
        ORDER BY m.rating DESC
        SKIP $skip
        LIMIT $limit
        `,
        { genre: opts.genre, skip: neo4jInt(skip), limit: neo4jInt(limit) }
      );

      const movies = result.records.map((r) =>
        mapMovie(r.get("movie") as Record<string, unknown>)
      );
      return { movies, total };
    } else {
      const countResult = await session.run(
        `MATCH (m:Movie) RETURN count(m) AS total`
      );
      const total = toNumber(countResult.records[0]?.get("total") ?? 0);

      const result = await session.run(
        `
        MATCH (m:Movie)
        WITH m, [(m)-[:HAS_GENRE]->(g:Genre) | g.name] AS genres
        RETURN m { .id, .title, .year, .rating, .runtime, .plot, .poster, genres: genres } AS movie
        ORDER BY m.rating DESC
        SKIP $skip
        LIMIT $limit
        `,
        { skip: neo4jInt(skip), limit: neo4jInt(limit) }
      );

      const movies = result.records.map((r) =>
        mapMovie(r.get("movie") as Record<string, unknown>)
      );
      return { movies, total };
    }
  } finally {
    await session.close();
  }
}

/**
 * Returns all genres with movie counts.
 */
export async function listGenres(): Promise<Genre[]> {
  const session = getReadSession();
  try {
    const result = await session.run(`
      MATCH (g:Genre)<-[:HAS_GENRE]-(m:Movie)
      RETURN g.name AS name, count(m) AS count
      ORDER BY count DESC
    `);
    return result.records.map((r) => ({
      name: r.get("name") as string,
      count: toNumber(r.get("count")),
    }));
  } finally {
    await session.close();
  }
}

// ─── Movie Detail ─────────────────────────────────────────────────────────────

/**
 * Returns full details for a single movie: genres, cast, director, and similar
 * movies (2-hop traversal through shared actors → other movies).
 */
export async function getMovie(id: string): Promise<MovieDetail | null> {
  const session = getReadSession();
  try {
    // Fetch movie core + genres + cast + directors using explicit OPTIONAL MATCH
    // instead of nested pattern comprehensions, which CognoDB does not support.
    const result = await session.run(
      `
      MATCH (m:Movie {id: $id})
      OPTIONAL MATCH (m)-[:HAS_GENRE]->(g:Genre)
      OPTIONAL MATCH (m)<-[:DIRECTED]-(d:Person)
      OPTIONAL MATCH (m)<-[ra:ACTED_IN]-(a:Person)
      WITH m,
           collect(DISTINCT g.name)                                       AS genres,
           collect(DISTINCT d { .id, .name, .born, .bio, .photo })        AS directors,
           collect(DISTINCT a { .id, .name, .born, .bio, .photo, role: ra.role }) AS actors
      RETURN m { .id, .title, .year, .rating, .runtime, .plot, .poster } AS movie,
             genres, directors, actors
      `,
      { id }
    );

    if (result.records.length === 0) return null;

    const rec = result.records[0];
    const raw = rec.get("movie") as Record<string, unknown>;
    const genres   = rec.get("genres")    as string[];
    const directors = (rec.get("directors") as Record<string, unknown>[]).filter((d) => d.id);
    const actors    = (rec.get("actors")    as Record<string, unknown>[]).filter((a) => a.id);

    // ── Similar movies: 2-hop traversal ──────────────────────────────────────
    // Movie A → (actor) → Movie B  (shares at least 2 cast members)
    // This is the query a relational DB would find awkward (recursive join).
    const simResult = await session.run(
      `
      MATCH (m:Movie {id: $id})<-[:ACTED_IN]-(a:Person)-[:ACTED_IN]->(other:Movie)
      WHERE other.id <> $id
      WITH other, count(DISTINCT a) AS sharedActors
      WHERE sharedActors >= 2
      OPTIONAL MATCH (other)-[:HAS_GENRE]->(g:Genre)
      WITH other, sharedActors, collect(g.name) AS genres
      RETURN other { .id, .title, .year, .rating, .runtime, .plot, .poster } AS movie,
             genres, sharedActors
      ORDER BY sharedActors DESC, other.rating DESC
      LIMIT 6
      `,
      { id }
    );

    const similarMovies = simResult.records.map((r) => ({
      ...mapMovie(r.get("movie") as Record<string, unknown>),
      genres: r.get("genres") as string[],
    }));

    return {
      ...mapMovie(raw),
      genres,
      directors: directors.map(mapPerson),
      actors: actors.map((a) => ({
        ...mapPerson(a),
        role: a.role as string,
      })),
      similarMovies,
    };
  } finally {
    await session.close();
  }
}

// ─── Person Detail ────────────────────────────────────────────────────────────

/**
 * Returns full details for a person including their collaborators —
 * other people they've shared a film with, ordered by collaboration count.
 */
export async function getPerson(id: string): Promise<PersonDetail | null> {
  const session = getReadSession();
  try {
    // Fetch person + directed movies (with genres) using explicit OPTIONAL MATCH
    const directedResult = await session.run(
      `
      MATCH (p:Person {id: $id})
      OPTIONAL MATCH (p)-[:DIRECTED]->(m:Movie)
      OPTIONAL MATCH (m)-[:HAS_GENRE]->(g:Genre)
      WITH p, m, collect(g.name) AS genres
      WITH p, collect(CASE WHEN m IS NOT NULL THEN
        m { .id, .title, .year, .rating, .runtime, .plot, .poster, genres: genres }
        ELSE null END
      ) AS directed
      RETURN p { .id, .name, .born, .bio, .photo } AS person,
             [x IN directed WHERE x IS NOT NULL] AS directedMovies
      `,
      { id }
    );

    if (directedResult.records.length === 0) return null;
    const personRaw = directedResult.records[0].get("person") as Record<string, unknown>;
    const directedMovies = (directedResult.records[0].get("directedMovies") as Record<string, unknown>[])
      .map(mapMovie);

    // Fetch acted-in movies with genres and role
    const actedResult = await session.run(
      `
      MATCH (p:Person {id: $id})-[r:ACTED_IN]->(m:Movie)
      OPTIONAL MATCH (m)-[:HAS_GENRE]->(g:Genre)
      WITH p, m, r, collect(g.name) AS genres
      RETURN m { .id, .title, .year, .rating, .runtime, .plot, .poster } AS movie,
             genres, r.role AS role
      `,
      { id }
    );

    const actedInMovies = actedResult.records.map((rec) => ({
      ...mapMovie(rec.get("movie") as Record<string, unknown>),
      genres: rec.get("genres") as string[],
      role: rec.get("role") as string,
    }));

    // ── Collaborators: people this person has worked with ────────────────────
    const collabResult = await session.run(
      `
      MATCH (p:Person {id: $id})-[:ACTED_IN|DIRECTED]->(m:Movie)<-[:ACTED_IN|DIRECTED]-(other:Person)
      WHERE other.id <> $id
      WITH other, count(DISTINCT m) AS sharedMovies
      RETURN other { .id, .name, .born, .bio, .photo } AS person,
             sharedMovies
      ORDER BY sharedMovies DESC
      LIMIT 10
      `,
      { id }
    );

    const collaborators = collabResult.records.map((r) => ({
      ...mapPerson(r.get("person") as Record<string, unknown>),
      sharedMovies: toNumber(r.get("sharedMovies")),
    }));

    return {
      ...mapPerson(personRaw),
      directedMovies,
      actedInMovies,
      collaborators,
    };
  } finally {
    await session.close();
  }
}

// ─── Actor Connection (Six Degrees) ──────────────────────────────────────────

/**
 * Finds the shortest path between two actors through shared movies.
 * This is the canonical "hard for SQL, trivial for a graph" query.
 * Uses shortestPath() over variable-length relationships up to 10 hops.
 */
export async function findConnection(
  fromId: string,
  toId: string
): Promise<ConnectionPath | null> {
  const session = getReadSession();
  try {
    const result = await session.run(
      `
      MATCH (a:Person {id: $fromId}), (b:Person {id: $toId})
      MATCH path = shortestPath(
        (a)-[:ACTED_IN|DIRECTED*..10]-(b)
      )
      RETURN path
      LIMIT 1
      `,
      { fromId, toId }
    );

    if (result.records.length === 0) return null;

    const path = result.records[0].get("path");
    // path.segments: Array<{ start, relationship, end }>
    const pathNodes: PathNode[] = [];

    // The path alternates Person → Movie → Person → Movie → ...
    const segments = path.segments as Array<{
      start: { labels: string[]; properties: Record<string, unknown> };
      relationship: { type: string; properties: Record<string, unknown> };
      end: { labels: string[]; properties: Record<string, unknown> };
    }>;

    // Add the first node
    if (segments.length > 0) {
      const firstNode = segments[0].start;
      pathNodes.push(nodeToPathNode(firstNode));
    }

    for (const seg of segments) {
      pathNodes.push(nodeToPathNode(seg.end));
    }

    // Deduplicate while preserving order
    const seen = new Set<string>();
    const uniqueNodes = pathNodes.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });

    return {
      nodes: uniqueNodes,
      hops: Math.floor(uniqueNodes.filter((n) => n.type === "movie").length),
    };
  } finally {
    await session.close();
  }
}

function nodeToPathNode(node: {
  labels: string[];
  properties: Record<string, unknown>;
}): PathNode {
  if (node.labels.includes("Movie")) {
    return {
      type: "movie",
      id: node.properties.id as string,
      label: node.properties.title as string,
      sublabel: String(node.properties.year),
    };
  }
  return {
    type: "person",
    id: node.properties.id as string,
    label: node.properties.name as string,
    sublabel: String(node.properties.born),
  };
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Full-text search across movies and people.
 * Uses case-insensitive CONTAINS.
 * Runs two separate queries and merges results in JS to avoid
 * CALL { UNION ALL } subquery syntax which some openCypher versions don't support.
 */
export async function search(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  // Two separate sessions — parallel queries require separate sessions.
  const s1 = getReadSession();
  const s2 = getReadSession();
  try {
    const [movieResult, personResult] = await Promise.all([
      s1.run(
        `
        MATCH (m:Movie)
        WHERE toLower(m.title) CONTAINS toLower($q)
        RETURN m.id AS id, 'movie' AS type, m.title AS label,
               toString(m.year) + ' · ' + toString(m.rating) + '★' AS sublabel,
               m.poster AS image
        LIMIT 5
        `,
        { q: query }
      ),
      s2.run(
        `
        MATCH (p:Person)
        WHERE toLower(p.name) CONTAINS toLower($q)
        RETURN p.id AS id, 'person' AS type, p.name AS label,
               'Born ' + toString(p.born) AS sublabel,
               p.photo AS image
        LIMIT 5
        `,
        { q: query }
      ),
    ]);

    const toResult = (r: (typeof movieResult.records)[0]): SearchResult => ({
      id: r.get("id") as string,
      type: r.get("type") as "movie" | "person",
      label: r.get("label") as string,
      sublabel: r.get("sublabel") as string,
      image: r.get("image") as string,
    });

    return [
      ...movieResult.records.map(toResult),
      ...personResult.records.map(toResult),
    ].slice(0, 10);
  } finally {
    await Promise.all([s1.close(), s2.close()]);
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getStats(): Promise<{
  movies: number;
  people: number;
  relationships: number;
  genres: number;
}> {
  // Each count needs its own session — a single session handles one
  // active transaction at a time, so parallel queries require separate sessions.
  const [s1, s2, s3, s4] = [
    getReadSession(),
    getReadSession(),
    getReadSession(),
    getReadSession(),
  ];
  try {
    const [mResult, pResult, gResult, rResult] = await Promise.all([
      s1.run(`MATCH (m:Movie)  RETURN count(m) AS c`),
      s2.run(`MATCH (p:Person) RETURN count(p) AS c`),
      s3.run(`MATCH (g:Genre)  RETURN count(g) AS c`),
      s4.run(`MATCH ()-[r]->() RETURN count(r) AS c`),
    ]);
    return {
      movies:        toNumber(mResult.records[0]?.get("c") ?? 0),
      people:        toNumber(pResult.records[0]?.get("c") ?? 0),
      genres:        toNumber(gResult.records[0]?.get("c") ?? 0),
      relationships: toNumber(rResult.records[0]?.get("c") ?? 0),
    };
  } finally {
    await Promise.all([s1.close(), s2.close(), s3.close(), s4.close()]);
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

import neo4j from "neo4j-driver";
function neo4jInt(n: number) {
  return neo4j.int(n);
}
