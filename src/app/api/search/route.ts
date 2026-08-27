import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/queries";
import { verifyConnectivity } from "@/lib/neo4j";

export async function GET(req: NextRequest) {
  const connected = await verifyConnectivity();
  if (!connected) {
    return NextResponse.json(
      { error: "Database is unreachable.", code: "DB_UNAVAILABLE" },
      { status: 503 }
    );
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await search(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[api/search]", err);
    return NextResponse.json(
      { error: "Search failed.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
