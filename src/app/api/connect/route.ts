import { NextRequest, NextResponse } from "next/server";
import { findConnection } from "@/lib/queries";
import { verifyConnectivity } from "@/lib/neo4j";

export async function GET(req: NextRequest) {
  const connected = await verifyConnectivity();
  if (!connected) {
    return NextResponse.json(
      { error: "Database is unreachable.", code: "DB_UNAVAILABLE" },
      { status: 503 }
    );
  }

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Both 'from' and 'to' person IDs are required.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  if (from === to) {
    return NextResponse.json(
      { error: "Please select two different people.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  try {
    const path = await findConnection(from, to);
    if (!path) {
      return NextResponse.json({ path: null, message: "No connection found between these two people." });
    }
    return NextResponse.json({ path });
  } catch (err) {
    console.error("[api/connect]", err);
    return NextResponse.json(
      { error: "Connection search failed.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
