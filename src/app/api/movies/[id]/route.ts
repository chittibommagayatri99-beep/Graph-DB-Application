import { NextRequest, NextResponse } from "next/server";
import { getMovie } from "@/lib/queries";
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
    const movie = await getMovie(params.id);
    if (!movie) {
      return NextResponse.json({ error: "Movie not found.", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(movie);
  } catch (err) {
    console.error("[api/movies/[id]]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
