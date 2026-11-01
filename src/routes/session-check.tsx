import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

// Temporary diagnostic page. Shows the NAMES of cookies the server receives (never values)
// and whether the server recognises a signed-in session. Remove after the login issue is fixed.
const sessionCheck = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const cookieNames = (request?.headers.get("cookie") ?? "")
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter(Boolean);
  let sessionFound = false;
  let error = "";
  try {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    sessionFound = Boolean(await getSessionUser());
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  return { cookieNames, sessionFound, error };
});

export const Route = createFileRoute("/session-check")({
  head: () => ({ meta: [{ title: "Session check — Raya Mart" }, { name: "robots", content: "noindex" }] }),
  component: SessionCheck,
});

function SessionCheck() {
  const [result, setResult] = useState("Loading…");
  useEffect(() => {
    sessionCheck()
      .then((r) => setResult(JSON.stringify(r, null, 2)))
      .catch((e) => setResult("Error: " + String(e)));
  }, []);
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-serif text-2xl">Session check</h1>
      <pre className="mt-4 whitespace-pre-wrap break-all text-sm">{result}</pre>
    </main>
  );
}
