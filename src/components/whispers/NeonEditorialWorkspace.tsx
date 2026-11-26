import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { type EditorialCommand, publicationActions } from "@/lib/whispers/editorial";

type Packet = Extract<EditorialCommand, { action: "request_experts" }>["packet"];
type Update = Extract<EditorialCommand, { action: "draft_update" }>["update"];
type Assessment = { choice: "consistent" | "conflicting" | "cannot_assess"; explanation: string };

interface EditorialData {
  reviewer: string[];
  expert: string[];
  publisher: string[];
  requests: {
    id: string; workspace: string; packet: Packet; state: string; interpretation: string | null;
    reviewer: boolean; assigned: boolean; mine: Assessment | null; responses: Assessment[];
  }[];
  updates: { id: string; workspace: string; body: Update; state: string; mine: boolean; disclosed: boolean }[];
}

const packetFields = [
  ["claim", "Redacted claim", 600], ["context", "Broad context", 200],
  ["period", "Time period", 100], ["materials", "Redacted materials", 2000], ["question", "Question for experts", 600],
] as const;
const updateFields = [
  ["title", "Title", 150], ["summary", "Summary", 2000], ["known", "What is known", 1000],
  ["uncertain", "What is uncertain", 1000], ["sources", "Public source URLs, one per line", 4000],
] as const;
const publicationLabels = {
  submit_update: "Submit for review", disclosure: "Record disclosure review", approve: "Approve",
  publish: "Publish", withdraw: "Withdraw",
} as const;

export function NeonEditorialWorkspace({ fetchStaff, reports }: {
  fetchStaff: (query?: string, init?: RequestInit) => Promise<Response>;
  reports: { id: string; category: string; workspace: string; received_at: string }[];
}) {
  const [data, setData] = useState<EditorialData>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetchStaff("?editorial", { signal: controller.signal }).then(async response => {
      if (response.ok) setData(await response.json() as EditorialData);
      else if (response.status !== 403) throw new Error();
    }).catch(() => {
      if (!controller.signal.aborted) setError("Unable to load expert and publication work.");
    });
    return () => controller.abort();
  }, [fetchStaff]);

  async function save(command: EditorialCommand) {
    setError("");
    setBusy(true);
    try {
      const response = await fetchStaff("", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editorial: command }),
      });
      if (!response.ok) throw new Error();
      const refreshed = await fetchStaff("?editorial");
      if (!refreshed.ok) throw new Error();
      setData(await refreshed.json() as EditorialData);
    } catch {
      setError("The action could not be completed. Check access, source availability, and review status.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) return error ? <p role="alert">{error}</p> : null;
  return <section className="card grid gap-4 p-4">
    <h2>Expert and publication work</h2>
    {reports.length > 0 && <>
      <details>
        <summary>Request an expert assessment</summary>
        <p>Share only redacted material. Omit names, private codes, and identifying details.</p>
        <form className="grid gap-2" onSubmit={event => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const value = (key: string) => String(form.get(key) ?? "").trim();
          const packet = { claim: value("claim"), context: value("context"), period: value("period"),
            materials: value("materials"), question: value("question") };
          if (packet.claim && packet.question) void save({ action: "request_experts", id: value("report"), packet });
        }}>
          <ReportPicker reports={reports} />
          {packetFields.map(([key, label, limit]) => <label key={key}>{label}
            <textarea className="field" name={key} maxLength={limit} required={key === "claim" || key === "question"} />
          </label>)}
          <Button disabled={busy} type="submit">Send redacted packet</Button>
        </form>
      </details>
      <details>
        <summary>Draft a public update</summary>
        <form className="grid gap-2" onSubmit={event => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const value = (key: string) => String(form.get(key) ?? "").trim();
          const update = { title: value("title"), summary: value("summary"), known: value("known"),
            uncertain: value("uncertain"), sources: value("sources").split("\n").map(url => url.trim()).filter(Boolean) };
          if (update.title && update.summary && update.uncertain) {
            void save({ action: "draft_update", id: value("report"), update });
          }
        }}>
          <ReportPicker reports={reports} />
          {updateFields.map(([key, label, limit]) => <label key={key}>{label}
            <textarea className="field" name={key} maxLength={limit} required={key === "title" || key === "summary" || key === "uncertain"} />
          </label>)}
          <Button disabled={busy} type="submit">Save update draft</Button>
        </form>
      </details>
    </>}
    {data.requests.map(request => <article className="grid gap-2 border-t pt-3" key={request.id}>
      <h3>{request.packet.claim}</h3>
      <p>{request.workspace} · {request.state}</p>
      {packetFields.slice(1).map(([key, label]) => request.packet[key] &&
        <p key={key} className="whitespace-pre-wrap"><strong>{label}</strong> {request.packet[key]}</p>)}
      {request.mine && <p>Your assessment — {request.mine.choice} · {request.mine.explanation}</p>}
      {request.assigned && !request.mine && request.state === "open" && <form className="grid gap-2" onSubmit={event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const text = String(form.get("text") ?? "").trim();
        const choice = form.get("choice");
        if (text && (choice === "consistent" || choice === "conflicting" || choice === "cannot_assess")) {
          void save({ action: "expert_response", id: request.id, choice, text });
        }
      }}>
        <label>Assessment<select className="field" name="choice">
          <option value="consistent">Consistent</option><option value="conflicting">Conflicting</option>
          <option value="cannot_assess">Cannot assess</option>
        </select></label>
        <label>Independent explanation<textarea className="field" name="text" maxLength={600} required /></label>
        <Button disabled={busy} type="submit">Submit assessment</Button>
      </form>}
      {request.reviewer && <>
        {request.responses.map((response, index) => <p key={index}>{response.choice} · {response.explanation}</p>)}
        {request.state === "open" && <form className="grid gap-2" onSubmit={event => {
          event.preventDefault();
          const text = String(new FormData(event.currentTarget).get("interpretation") ?? "").trim();
          if (text) void save({ action: "interpret", id: request.id, text });
        }}>
          <label>Moderator interpretation<textarea name="interpretation" className="field" maxLength={2000} required /></label>
          <Button disabled={busy} type="submit">Save interpretation and close</Button>
        </form>}
      </>}
      {request.interpretation && <p className="whitespace-pre-wrap">{request.interpretation}</p>}
    </article>)}
    {data.updates.map(update => <article className="grid gap-2 border-t pt-3" key={update.id}>
      <h3>{update.body.title}</h3>
      <p>{update.workspace} · {update.state}</p>
      {updateFields.slice(1, 4).map(([key, label]) => key !== "sources" && <p key={key} className="whitespace-pre-wrap">
        <strong>{label}</strong> {update.body[key]}
      </p>)}
      {update.body.sources?.map(source => <p className="break-all" key={source}>{source}</p>)}
      <div className="flex flex-wrap gap-2">{publicationActions.filter(action => {
        if (action === "submit_update") return update.state === "draft" && data.reviewer.includes(update.workspace);
        if (!data.publisher.includes(update.workspace)) return false;
        if (action === "withdraw") return update.state === "published";
        if (update.mine) return false;
        if (action === "publish") return update.state === "approved";
        return update.state === "under_review" && (action === "disclosure" || update.disclosed);
      }).map(action => <Button disabled={busy} variant="outline" key={action}
        onClick={() => void save({ action, id: update.id })}>{publicationLabels[action]}</Button>)}</div>
    </article>)}
    {data.requests.length === 0 && data.updates.length === 0 && <p>No assignments or updates are available.</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

function ReportPicker({ reports }: { reports: { id: string; category: string; workspace: string; received_at: string }[] }) {
  return <label>Source report<select className="field" name="report" required>
    {reports.map(report => <option key={report.id} value={report.id}>
      {report.category || "Report"} · {report.workspace} · {report.received_at.slice(0, 10)} · {report.id.slice(0, 8)}
    </option>)}
  </select></label>;
}
