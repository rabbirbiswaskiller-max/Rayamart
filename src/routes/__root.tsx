import { useEffect } from "react";
import { createRootRoute, HeadContent, Outlet, redirect, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { getHeaderUser } from "@/lib/auth/header-user";
import { Shell } from "@/components/shell";
import { useRefCapture } from "@/lib/referral";
import appCss from "../styles.css?url";

// VITE_ADMIN_ONLY=1 is set only in the admin deployment (rayamart-admin).
// The main site never serves admin pages; the admin deployment serves nothing else.
const adminOnly = import.meta.env.VITE_ADMIN_ONLY === "1";

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const p = location.pathname;
    const isAdminPath = p.startsWith("/admin-") || p.startsWith("/manage-store");
    if (!adminOnly) {
      if (isAdminPath) throw redirect({ to: "/" });
      return;
    }
    const allowed = p === "/account" || isAdminPath;
    if (!allowed) throw redirect({ to: "/account" });
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Raya Mart — The import house" },
      {
        name: "description",
        content:
          "Raya Mart is a private import house in Dhaka. Curated skincare, fragrance, wellness and objects from abroad — sealed at origin, confirmed by the desk, delivered to your district.",
      },
      { name: "theme-color", content: "#1c3d34" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600&display=swap",
      },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  // Session identity for the header (signed-in name/initials). Cheap and never throws.
  loader: () => getHeaderUser(),
  component: RootDocument,
});

// Vercel Web Analytics loads in the browser, except on devices that opted out.
// Opt out once with ?noanalytics=1 on any page; opt back in with ?noanalytics=0.
const NO_ANALYTICS_KEY = "raya-no-analytics";
const ANALYTICS_SRC = "/_vercel/insights/script.js";

function useWebAnalytics() {
  useEffect(() => {
    try {
      const flag = new URLSearchParams(window.location.search).get("noanalytics");
      if (flag === "1") window.localStorage.setItem(NO_ANALYTICS_KEY, "1");
      if (flag === "0") window.localStorage.removeItem(NO_ANALYTICS_KEY);
      if (window.localStorage.getItem(NO_ANALYTICS_KEY) === "1") return;
    } catch {
      /* storage blocked: keep tracking */
    }
    if (document.querySelector(`script[src="${ANALYTICS_SRC}"]`)) return;
    const script = document.createElement("script");
    script.src = ANALYTICS_SRC;
    script.defer = true;
    document.head.appendChild(script);
  }, []);
}

function RootDocument() {
  useRefCapture();
  useWebAnalytics();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          <Shell>
            <Outlet />
          </Shell>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
