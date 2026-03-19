import { sql } from "drizzle-orm";
import { getDb } from "@null/db";

export const dynamic = "force-dynamic";

type QueryResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ReturnType<typeof serializeError>;
    };

function serializeError(error: unknown) {
  if (error instanceof Error) {
    const errorWithDetails = error as Error & {
      code?: string;
      cause?: unknown;
      detail?: string;
      hint?: string;
      severity?: string;
      errno?: number;
    };

    return {
      name: errorWithDetails.name,
      message: errorWithDetails.message,
      stack: errorWithDetails.stack,
      code: errorWithDetails.code ?? null,
      detail: errorWithDetails.detail ?? null,
      hint: errorWithDetails.hint ?? null,
      severity: errorWithDetails.severity ?? null,
      errno: errorWithDetails.errno ?? null,
      cause: serializeCause(errorWithDetails.cause),
    };
  }

  return {
    message: String(error),
    raw: error,
  };
}

function serializeCause(cause: unknown) {
  if (cause instanceof Error) {
    const causeWithDetails = cause as Error & {
      code?: string;
      detail?: string;
      hint?: string;
      severity?: string;
    };

    return {
      name: causeWithDetails.name,
      message: causeWithDetails.message,
      stack: causeWithDetails.stack,
      code: causeWithDetails.code ?? null,
      detail: causeWithDetails.detail ?? null,
      hint: causeWithDetails.hint ?? null,
      severity: causeWithDetails.severity ?? null,
    };
  }

  return cause ?? null;
}

async function runQuery<T>(query: Promise<T>): Promise<QueryResult<T>> {
  try {
    return {
      ok: true,
      data: await query,
    };
  } catch (error) {
    return {
      ok: false,
      error: serializeError(error),
    };
  }
}

export async function GET() {
  const db = getDb();

  if (!db) {
    return Response.json(
      {
        hasConnection: false,
        error: {
          message: "Database connection not available from @null/db#getDb().",
        },
      },
      { status: 500 },
    );
  }

  const [
    currentDatabaseResult,
    currentUserResult,
    organizationsCountResult,
    profilesCountResult,
    organizationMembersCountResult,
    membershipJoinResult,
  ] = await Promise.all([
    runQuery(db.execute(sql`select current_database()`)),
    runQuery(db.execute(sql`select current_user`)),
    runQuery(
      db.execute(sql`select count(*)::int as count from public.organizations`),
    ),
    runQuery(
      db.execute(sql`select count(*)::int as count from public.profiles`),
    ),
    runQuery(
      db.execute(
        sql`select count(*)::int as count from public.organization_members`,
      ),
    ),
    runQuery(
      db.execute(sql`
      select
        o.id,
        o.name,
        o.slug,
        om.role,
        o.created_at
      from public.organization_members om
      inner join public.organizations o
        on om.organization_id = o.id
      where om.user_id = 'd9b761b9-9a08-4979-8982-ecd7fcf29271'
    `),
    ),
  ]);

  const response = {
    hasConnection: true,
    currentDatabase: currentDatabaseResult,
    currentUser: currentUserResult,
    organizationsCount: organizationsCountResult,
    profilesCount: profilesCountResult,
    organizationMembersCount: organizationMembersCountResult,
    membershipJoin: membershipJoinResult,
  };

  const hasError = Object.values(response).some(
    (value) =>
      typeof value === "object" &&
      value !== null &&
      "ok" in value &&
      value.ok === false,
  );

  return Response.json(response, { status: hasError ? 500 : 200 });
}
