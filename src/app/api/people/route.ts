import { NextResponse } from "next/server";
import { getReadSession, toNumber, verifyConnectivity } from "@/lib/neo4j";

export async function GET() {
  const connected = await verifyConnectivity();
  if (!connected) {
    return NextResponse.json(
      { error: "Database is unreachable.", code: "DB_UNAVAILABLE" },
      { status: 503 }
    );
  }

  const session = getReadSession();
  try {
    const result = await session.run(`
      MATCH (p:Person)
      OPTIONAL MATCH (p)-[:ACTED_IN]->(ma:Movie)
      OPTIONAL MATCH (p)-[:DIRECTED]->(md:Movie)
      WITH p,
           count(DISTINCT ma) AS actedIn,
           count(DISTINCT md) AS directed
      RETURN p { .id, .name, .born, .bio, .photo,
                 actedIn: actedIn, directed: directed } AS person
      ORDER BY (actedIn + directed) DESC
      LIMIT 100
    `);

    const people = result.records.map((r) => {
      const p = r.get("person") as Record<string, unknown>;
      return {
        id: p.id,
        name: p.name,
        born: toNumber(p.born),
        bio: p.bio,
        photo: p.photo,
        actedIn: toNumber(p.actedIn),
        directed: toNumber(p.directed),
      };
    });

    return NextResponse.json({ people });
  } catch (err) {
    console.error("[api/people]", err);
    return NextResponse.json(
      { error: "Failed to fetch people.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
