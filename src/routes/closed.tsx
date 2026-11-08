import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { t } from "@/lib/whispers/i18n";

export const Route = createFileRoute("/closed")({
  head: () => ({
    meta: [
      { title: "Page closed — Whispers" },
      { name: "description", content: "This page was closed." },
      { property: "og:title", content: "Page closed — Whispers" },
      { property: "og:description", content: "This page was closed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Closed,
});

function Closed() {
  useTranslationVersion();
  return (
    <main className="min-h-dvh flex items-center justify-center px-5">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl">{t("closed.title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("closed.body")}</p>
        <Link to="/" replace className="btn btn-secondary mt-6">{t("closed.start")}</Link>
      </div>
    </main>
  );
}
