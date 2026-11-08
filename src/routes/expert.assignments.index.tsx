import { tr, useTranslationVersion } from "@/lib/whispers/translation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { StaffShell } from "@/components/whispers/StaffShell";
import { useWhispers } from "@/lib/whispers/context";

export const Route = createFileRoute("/expert/assignments/")({
  head: () => ({
    meta: [
      { title: "Assignments — Whispers expert" },
      { name: "description", content: "Assigned expert checks." },
      { property: "og:title", content: "Assignments — Whispers expert" },
      { property: "og:description", content: "Assigned expert checks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <StaffShell need="expert" title={tr("Your assignments")}><List /></StaffShell>,
});

function List() {
  useTranslationVersion();
  const { store } = useWhispers();
  const items = store.listAssignments(store.actorId);
  return items.length === 0 ? <p className="card p-5">{tr("No assigned checks.")}</p> : (
    <ul className="grid gap-2">{items.map((x) => (
      <li key={x.id}><Link to="/expert/assignments/$id" params={{ id: x.id }} className="card p-4 block hover:border-primary">
        <p className="font-semibold">{x.context}</p><p className="hint">{x.period} · {x.mine ? "You responded" : "Awaiting your response"} · {x.state}</p>
      </Link></li>))}
    </ul>
  );
}
