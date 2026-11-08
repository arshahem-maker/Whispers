import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute } from "@tanstack/react-router";
import { CitizenShell } from "@/components/whispers/CitizenShell";
import { useWhispers } from "@/lib/whispers/context";
import { t } from "@/lib/whispers/i18n";

export const Route = createFileRoute("/updates")({
  head: () => ({
    meta: [
      { title: "Updates — Whispers" },
      { name: "description", content: "Reviewed humanitarian summaries. Not a live incident feed." },
      { property: "og:title", content: "Updates — Whispers" },
      { property: "og:description", content: "Reviewed humanitarian summaries. Not a live incident feed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Updates,
});

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function Updates() {
  useTranslationVersion();
  const { store } = useWhispers();
  const updates = store.listPublicUpdates(); // public projection only
  return (
    <CitizenShell>
      <h1>{t("updates.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("updates.lede")}</p>
      {updates.length === 0 ? <p className="card p-5 mt-6">{t("updates.empty")}</p> : (
        <ul className="mt-6 grid gap-4">
          {updates.map((u) => (
            <li key={u.id}>
              <article className="card p-5" aria-labelledby={`u-${u.id}`}>
                <div className="flex flex-wrap gap-2 mb-3">
                  {u.demo && <span className="chip !text-warning !border-warning/50">{t("updates.example")}</span>}
                  {u.withdrawn && <span className="chip !text-destructive">{t("updates.withdrawn")}</span>}
                  {u.corrections.length > 0 && <span className="chip">{t("updates.corrected")}</span>}
                </div>
                <h2 id={`u-${u.id}`} className={u.withdrawn ? "line-through text-muted-foreground" : ""}>{u.title}</h2>
                <p className="hint mt-1">{u.broadContext} · {t("updates.published", { d: fmt(u.publishedAt) })}</p>
                {!u.withdrawn && <>
                  <p className="mt-4">{u.summary}</p>
                  <h3 className="label mt-4">{t("updates.known")}</h3>
                  <p className="mt-1">{u.known}</p>
                  <h3 className="label mt-4">{t("updates.uncertain")}</h3>
                  <p className="mt-1">{u.uncertain}</p>
                  {u.sources.length > 0 && <>
                    <h3 className="label mt-4">{t("updates.sources")}</h3>
                    <ul className="mt-1 list-disc pl-5">{u.sources.map((s) => <li key={s}>{s}</li>)}</ul>
                  </>}
                </>}
                {u.corrections.length > 0 && (
                  <div className="mt-4 border-t pt-3">
                    {u.corrections.map((c, i) => <p key={i} className="hint">{c.date}: {c.note}</p>)}
                  </div>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </CitizenShell>
  );
}
