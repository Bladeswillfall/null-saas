import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { TRPCError } from "@trpc/server";
import { appRouter, createContext } from "@null/api";
import { createClient } from "@/lib/supabase/server";

function serializeErrorDetails(error: TRPCError) {
  const cause = error.cause;
  const causeDetails =
    cause instanceof Error
      ? {
          name: cause.name,
          message: cause.message,
          stack: cause.stack,
          ...(typeof cause === "object" && cause !== null
            ? {
                code: "code" in cause ? cause.code : undefined,
                detail: "detail" in cause ? cause.detail : undefined,
                hint: "hint" in cause ? cause.hint : undefined,
                severity: "severity" in cause ? cause.severity : undefined,
              }
            : {}),
        }
      : cause;

  return {
    message: error.message,
    code: error.code,
    name: error.name,
    stack: error.stack,
    cause: causeDetails,
  };
}

const handler = async (req: Request) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[trpc/route] Auth error:", authError.message);
    }

    return fetchRequestHandler({
      endpoint: "/api/trpc",
      req,
      router: appRouter,
      createContext: () =>
        createContext({
          supabase,
          user,
        }),
      onError: ({ error, path, type }) => {
        console.error(
          `[trpc/route] Error in ${path ?? "unknown"} (${type}):`,
          serializeErrorDetails(error),
        );
      },
    });
  } catch (error) {
    console.error("[trpc/route] Handler error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export { handler as GET, handler as POST };
