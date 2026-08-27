import { NextResponse } from "next/server";
import { getStats } from "@/lib/queries";
import { verifyConnectivity } from "@/lib/neo4j";

export async function GET() {
  const connected = await verifyConnectivity();
  if (!connected) {
    return NextResponse.json(
      { error: "Database is unreachable.", code: "DB_UNAVAILABLE" },
      { status: 503 }
    );
  }

  try {
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[api/stats]", err);
    return NextResponse.json(
      { error: "Failed to fetch stats.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
