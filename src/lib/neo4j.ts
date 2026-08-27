import neo4j, { Driver, Session, Integer } from "neo4j-driver";

let driver: Driver | null = null;

/**
 * Returns a singleton Neo4j driver instance connected to CognoDB.
 * Reads connection details exclusively from environment variables — never
 * hard-coded — so secrets are never committed to the repository.
 */
export function getDriver(): Driver {
  if (driver) return driver;

  const uri = process.env.COGNODB_URI;
  const user = process.env.COGNODB_USER;
  const password = process.env.COGNODB_PASSWORD;

  if (!uri || !user || !password) {
    throw new Error(
      "Missing CognoDB connection environment variables. " +
        "Set COGNODB_URI, COGNODB_USER, and COGNODB_PASSWORD in your .env.local file."
    );
  }

  driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionLifetime: 3 * 60 * 1000, // 3 min
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 10_000,
    logging: {
      level: "warn",
      logger: (level, message) => {
        if (process.env.NODE_ENV === "development") {
          console[level === "warn" ? "warn" : "error"]("[neo4j]", message);
        }
      },
    },
  });

  return driver;
}

/**
 * Opens a read-only session. Callers must close it after use.
 */
export function getReadSession(): Session {
  return getDriver().session({ defaultAccessMode: neo4j.session.READ });
}

/**
 * Opens a write session. Callers must close it after use.
 */
export function getWriteSession(): Session {
  return getDriver().session({ defaultAccessMode: neo4j.session.WRITE });
}

/**
 * Verifies connectivity to the database. Returns true on success, false on failure.
 * Used to surface a graceful error state in the UI instead of an unhandled exception.
 */
export async function verifyConnectivity(): Promise<boolean> {
  try {
    await getDriver().verifyConnectivity();
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts a Neo4j Integer (int64) to a plain JS number safely.
 */
export function toNumber(val: unknown): number {
  if (neo4j.isInt(val as Integer)) {
    return (val as Integer).toNumber();
  }
  return Number(val);
}
