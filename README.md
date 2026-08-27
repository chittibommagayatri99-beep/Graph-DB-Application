# CineGraph — Movie Relationship Explorer

A graph-database-powered web application for exploring the hidden connections between films, actors, and directors. Built with Next.js 14 and [CognoDB](https://console.cognodb.com) (openCypher over Bolt).

![CineGraph Screenshot](docs/screenshot-home.png)

---

## Why a Graph Database?

Movie data is fundamentally relational in the *graph* sense — it's a network of people and films connected by roles, collaborations, and shared creative histories. The interesting questions are all about traversals:

| Question | Relational DB | Graph DB |
|---|---|---|
| "Which movies share at least 2 cast members with *Inception*?" | Self-join on a cast table, group-by, having count | 2-hop `MATCH (m)<-[:ACTED_IN]-(a)-[:ACTED_IN]->(other)` |
| "What is the shortest path between two actors?" | Recursive CTE with depth limit — expensive and complex | `shortestPath()` — O(V+E) breadth-first, one line |
| "Who are a director's most frequent collaborators?" | Multiple joins across person, film, role tables | Single pattern `MATCH (p)-[:DIRECTED\|ACTED_IN]->(m)<-[:ACTED_IN\|DIRECTED]-(other)` |

A relational schema needs at least 4 tables (movies, people, acted_in, directed) and multi-level self-joins to answer questions a graph answers with a single pattern match. As the network grows, traversal queries stay fast because the graph database only ever visits *connected* nodes — not the entire table.

---

## Data Model

```
(:Person)-[:DIRECTED]->(:Movie)
(:Person)-[:ACTED_IN {role: "..."}]->(:Movie)
(:Movie)-[:HAS_GENRE]->(:Genre)
```

### Node Labels

| Label | Properties |
|---|---|
| `Movie` | `id`, `title`, `year`, `rating`, `runtime`, `plot`, `poster` |
| `Person` | `id`, `name`, `born`, `bio`, `photo` |
| `Genre` | `name` |

### Relationship Types

| Type | From → To | Properties |
|---|---|---|
| `ACTED_IN` | `Person → Movie` | `role` (character name) |
| `DIRECTED` | `Person → Movie` | — |
| `HAS_GENRE` | `Movie → Genre` | — |

### Diagram

```
         ┌──────────────────────┐
         │        Person        │
         │  id, name, born,     │
         │  bio, photo          │
         └──────┬──────┬────────┘
                │      │
    [:DIRECTED] │      │ [:ACTED_IN {role}]
                │      │
         ┌──────▼──────▼────────┐       [:HAS_GENRE]    ┌───────────┐
         │        Movie         │──────────────────────▶│   Genre   │
         │  id, title, year,    │                        │   name    │
         │  rating, runtime,    │                        └───────────┘
         │  plot, poster        │
         └──────────────────────┘
```

---

## Features

- **Browse** — paginated movie grid with genre filtering and stats dashboard
- **Movie Detail** — cast, director, plot, and *Similar Movies* discovered via 2-hop graph traversal
- **Person Detail** — filmography and *Frequent Collaborators* via graph traversal
- **Six Degrees** — find the shortest path between any two people through shared films (uses `shortestPath()`)
- **Search** — live search across movies and people with keyboard navigation

---

## Key Cypher Queries

### 1. Similar Movies (2-hop traversal)

```cypher
MATCH (m:Movie {id: $id})<-[:ACTED_IN]-(a:Person)-[:ACTED_IN]->(other:Movie)
WHERE other.id <> $id
WITH other,
     count(DISTINCT a) AS sharedActors,
     [(other)-[:HAS_GENRE]->(g:Genre) | g.name] AS genres
WHERE sharedActors >= 2
RETURN other { .id, .title, .year, .rating, .runtime, .plot, .poster,
               genres: genres,
               sharedActors: sharedActors } AS movie
ORDER BY sharedActors DESC, other.rating DESC
LIMIT 6
```

*What it does:* From a movie, hop through actors to other movies. Any movie that shares ≥2 cast members is a strong match. A relational DB would require a self-join on a cast table with HAVING COUNT ≥ 2.

---

### 2. Shortest Actor Path (Six Degrees)

```cypher
MATCH (a:Person {id: $fromId}), (b:Person {id: $toId})
MATCH path = shortestPath(
  (a)-[:ACTED_IN|DIRECTED*..10]-(b)
)
RETURN path
LIMIT 1
```

*What it does:* Finds the shortest path between two people through any combination of `ACTED_IN` or `DIRECTED` relationships, up to 10 hops. This is the canonical example of a query trivial in a graph database but requiring recursive CTEs (or Dijkstra implementations) in SQL.

---

### 3. Frequent Collaborators (multi-hop with aggregation)

```cypher
MATCH (p:Person {id: $id})-[:ACTED_IN|DIRECTED]->(m:Movie)<-[:ACTED_IN|DIRECTED]-(other:Person)
WHERE other.id <> $id
WITH other, count(DISTINCT m) AS sharedMovies
RETURN other { .id, .name, .born, .bio, .photo, sharedMovies: sharedMovies } AS person
ORDER BY sharedMovies DESC
LIMIT 10
```

*What it does:* From a person, traverse to all their films, then to all other people on those films, and count shared films. In SQL this is a 3-table self-join with GROUP BY.

---

### 4. Genre-filtered movie listing with count

```cypher
MATCH (m:Movie)
WITH m, [(m)-[:HAS_GENRE]->(g:Genre) | g.name] AS genres
WHERE $genre IN genres
RETURN m { .id, .title, .year, .rating, .runtime, .plot, .poster, genres: genres } AS movie,
       count(*) OVER () AS total
ORDER BY m.rating DESC
SKIP $skip
LIMIT $limit
```

---

## Project Structure

```
cinegraph/
├── scripts/
│   └── seed.js              # Data loading script (Node.js, parameterised Cypher)
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout + Navbar
│   │   ├── page.tsx          # Home — movie browse with genre filters
│   │   ├── movies/[id]/      # Movie detail page
│   │   ├── people/           # People listing
│   │   ├── people/[id]/      # Person detail page
│   │   ├── connect/          # Six Degrees page
│   │   └── api/              # Next.js API routes (server-side DB access)
│   │       ├── movies/
│   │       ├── people/
│   │       ├── search/
│   │       ├── connect/
│   │       └── stats/
│   ├── components/           # Reusable React components
│   │   ├── Navbar.tsx
│   │   ├── SearchModal.tsx
│   │   ├── MovieCard.tsx
│   │   ├── PersonCard.tsx
│   │   ├── ErrorState.tsx
│   │   └── EmptyState.tsx
│   ├── lib/
│   │   ├── neo4j.ts          # Driver singleton + session helpers
│   │   └── queries.ts        # All parameterised Cypher queries
│   └── types/
│       └── index.ts          # Shared TypeScript types
├── .env.example              # Template — never commit real credentials
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Setup & Running

### 1. Prerequisites

- Node.js 18+
- A free CognoDB instance (see below)

### 2. Create a CognoDB instance

1. Sign up at [https://console.cognodb.com/signup](https://console.cognodb.com/signup) (no credit card required)
2. Click **Create Instance**, choose a region, select the **free (c0) tier**
3. Wait ~1 minute for provisioning
4. Copy your **Bolt URI** (`bolt+s://...databases.cognodb.cloud`) and **password** — the password is shown only once

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
COGNODB_URI=bolt+s://YOUR_INSTANCE_ID.databases.cognodb.cloud
COGNODB_USER=cognodb
COGNODB_PASSWORD=your_generated_password_here
```

> ⚠️ Never commit `.env.local`. It is already listed in `.gitignore`.

### 4. Install dependencies

```bash
npm install
```

### 5. Seed the database

```bash
npm run seed
```

This will:
- Create uniqueness constraints and indexes
- Load 15 genres, 70+ people, and 35+ movies
- Create all `ACTED_IN`, `DIRECTED`, and `HAS_GENRE` relationships

Expected output:
```
🔗 Verifying connection to CognoDB…
✅ Connected.
📐 Creating constraints and indexes…
✅ Schema ready.
👤 Loading 70 people…
✅ People loaded.
🎬 Loading 35 movies…
...................................
✅ Movies and relationships loaded.
📊 Database summary:
   Movies       : 35
   People       : 70
   Relationships: 250+
🎉 Seed complete!
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 7. Build for production

```bash
npm run build
npm run start
```

---

## Deploying to Vercel

```bash
npm install -g vercel
vercel
```

Set the three environment variables (`COGNODB_URI`, `COGNODB_USER`, `COGNODB_PASSWORD`) in the Vercel project dashboard under **Settings → Environment Variables**.

---

## Engineering Notes

- **Connection secrets** are read exclusively from environment variables (`COGNODB_URI`, `COGNODB_USER`, `COGNODB_PASSWORD`). They are never hard-coded or committed.
- **All Cypher queries are parameterised** via the official Neo4j driver. No string concatenation of user input.
- **Graceful error handling**: every API route calls `verifyConnectivity()` before executing queries and returns a `503 DB_UNAVAILABLE` response with a user-friendly message if the database is unreachable.
- **Loading states** use skeleton components that match the layout of the real content.
- **Empty states** are handled at every data-fetching boundary.

---

## Screenshots

*(Add screenshots to the `docs/` folder and update the paths below)*

| Home | Movie Detail | Six Degrees |
|---|---|---|
| ![Home](docs/screenshot-home.png) | ![Movie](docs/screenshot-movie.png) | ![Connect](docs/screenshot-connect.png) |
