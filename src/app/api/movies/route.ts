import { NextRequest, NextResponse } from "next/server";
import { listMovies, listGenres } from "@/lib/queries";
import { verifyConnectivity } from "@/lib/neo4j";

export async function GET(req: NextRequest) {
  // Graceful connectivity check before executing queries
  const connected = await verifyConnectivity();
  if (!connected) {
    return NextResponse.json(
      { error: "Database is unreachable. Please try again later.", code: "DB_UNAVAILABLE" },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = req.nextUrl;
    const genre = searchParams.get("genre") ?? undefined;
    const skip = Number(searchParams.get("skip") ?? 0);
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const [{ movies, total }, genres] = await Promise.all([
      listMovies({ genre, skip, limit }),
      listGenres(),
    ]);

    return NextResponse.json({ movies, total, genres });
  } catch (err) {
    console.error("[api/movies]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
