import { NextRequest, NextResponse } from "next/server";
import { getPerson } from "@/lib/queries";
import { verifyConnectivity } from "@/lib/neo4j";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const connected = await verifyConnectivity();
  if (!connected) {
    return NextResponse.json(
      { error: "Database is unreachable. Please try again later.", code: "DB_UNAVAILABLE" },
      { status: 503 }
    );
  }

  try {
    const person = await getPerson(params.id);
    if (!person) {
      return NextResponse.json({ error: "Person not found.", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(person);
  } catch (err) {
    console.error("[api/people/[id]]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
