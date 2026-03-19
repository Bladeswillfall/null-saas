import { getQueryClient } from "@null/db";

export const dynamic = "force-dynamic";

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
      cause: errorWithDetails.cause ?? null,
    };
  }

  return {
    message: String(error),
    raw: error,
  };
}

export async function GET() {
  const queryClient = getQueryClient();

  if (!queryClient) {
    return Response.json(
      {
        hasQueryClient: false,
        error: {
          message:
            "Database query client not available from @null/db#getQueryClient().",
        },
      },
      { status: 500 },
    );
  }

  try {
    const currentDatabase = await queryClient`select current_database()`;
    const currentUser = await queryClient`select current_user`;
    const organizationsCount =
      await queryClient`select count(*) from public.organizations`;
    const profilesCount =
      await queryClient`select count(*) from public.profiles`;
    const organizationMembersCount =
      await queryClient`select count(*) from public.organization_members`;
    const membershipJoin = await queryClient.unsafe(`
      select
        o.id,
        o.name,
        o.slug,
        om.role,
        o.created_at
      from public.organization_members om
      inner join public.organizations o
        on om.organization_id = o.id
      where om.user_id = 'd9b761b9-9a08-4979-8982-ecd7fcf29271';
    `);

    return Response.json({
      hasQueryClient: true,
      currentDatabase,
      currentUser,
      organizationsCount,
      profilesCount,
      organizationMembersCount,
      membershipJoin,
    });
  } catch (error) {
    return Response.json(
      {
        hasQueryClient: true,
        error: serializeError(error),
      },
      { status: 500 },
    );
  }
}
