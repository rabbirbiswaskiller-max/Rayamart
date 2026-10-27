import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { previewPathRewrite } from "@/lib/preview-path-prefix";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    rewrite: previewPathRewrite(),
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: NotFound,
  });
}

function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-start justify-center px-6 py-24">
      <p className="text-xs uppercase tracking-widest text-mute">Mislaid</p>
      <h1 className="mt-3 font-serif text-5xl leading-none">
        This page has left the house.
      </h1>
      <p className="mt-4 text-ink-soft">
        The piece may have been renamed, or the link is older than the edit.
      </p>
      <a
        href="/"
        className="mt-8 inline-flex h-12 items-center bg-pine px-6 text-sm text-ivory"
      >
        Return to Raya Mart
      </a>
    </main>
  );
}
