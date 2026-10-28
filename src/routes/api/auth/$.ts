import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

const handleAuth = async ({ request }: { request: Request }) => {
  return auth.handler(request);
};

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handleAuth,
      POST: handleAuth,
      OPTIONS: handleAuth,
    },
  },
});
