import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { neonAuthClient } from "@/integrations/neon/auth-client";

interface ReportSummary {
  id: string;
  workspace: string;
  received_at: string;
  category: string;
  photos: string[];
}

async function reviewerFetch(query = "", init?: RequestInit) {
  const { data } = await neonAuthClient().getSession();
  if (!data?.session?.access_token) throw new Error("Sign in to continue.");
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch("/api/public/neon-reviewer" + query, { ...init, headers });
}

export function NeonReviewerWorkspace() {
  const [signedIn, setSignedIn] = useState(false);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const { data } = await neonAuthClient().getSession();
        if (controller.signal.aborted || !data?.session?.user) return;
        setSignedIn(true);
        const response = await reviewerFetch("", { signal: controller.signal });
        if (!response.ok) throw new Error("A mapped reviewer account is required.");
        const result = await response.json() as { reports: ReportSummary[] };
        if (!controller.signal.aborted) setReports(result.reports);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load reports.");
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  async function signIn() {
    setError("");
    try {
      const { error } = await neonAuthClient().signInWithOAuth({
        provider: "google",
        options: { redirectTo: new URL("/pilot", window.location.origin).href },
      });
      if (error) setError(error.message ?? "Sign-in failed.");
    } catch {
      setError("Sign-in is unavailable.");
    }
  }

  async function signOut() {
    setReports([]);
    setError("");
    try {
      const { error } = await neonAuthClient().signOut();
      if (error) throw new Error();
      setSignedIn(false);
    } catch {
      setError("Sign-out failed. Try again.");
    }
  }

  if (busy) return <p role="status">Loading reviewer access…</p>;
  return (
    <section className="grid gap-4" aria-label="Neon reviewer workspace">
      {signedIn
        ? <Button variant="outline" onClick={() => void signOut()}>Sign out</Button>
        : <Button onClick={() => void signIn()}>Sign in with Google</Button>}
      {error && <p role="alert">{error}</p>}
      {signedIn && !error && reports.length === 0 && <p>No reports are available in your assigned workspaces.</p>}
      {reports.map((report) => (
        <article className="card grid gap-2 p-4" key={report.id}>
          <h2>{report.category || "Fictional report"}</h2>
          <p className="hint">{report.workspace} · {report.received_at.slice(0, 10)}</p>
          <NeonReportDetail id={report.id} />
          {report.photos.map((id) => <NeonReviewerPhoto key={id} id={id} />)}
        </article>
      ))}
    </section>
  );
}

interface ReportDetail {
  report: { text: string | null; removal_requested_at: string | null };
  messages: { id: string; text: string; sender: string }[];
}

function NeonReportDetail({ id }: { id: string }) {
  const [detail, setDetail] = useState<ReportDetail>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function update(reply?: string) {
    setBusy(true);
    setError("");
    try {
      const response = reply === undefined
        ? await reviewerFetch("?report=" + encodeURIComponent(id))
        : await reviewerFetch("", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId: id, reply }),
        });
      if (response.status === 409) throw new Error("A removal request is pending.");
      if (!response.ok) throw new Error("The report is unavailable or your access has changed.");
      setDetail(await response.json() as ReportDetail);
      if (reply !== undefined) setMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The report is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="grid gap-2">
    <Button variant="outline" disabled={busy} onClick={() => {
      if (detail) { setDetail(undefined); setMessage(""); setError(""); }
      else void update();
    }}>{detail ? "Close report" : "Read report"}</Button>
    {detail && <>
      <p className="whitespace-pre-wrap">{detail.report.text}</p>
      {detail.messages.map(item => <p key={item.id} className="whitespace-pre-wrap">
        <strong>{item.sender}:</strong> {item.text}
      </p>)}
      {!detail.report.removal_requested_at && <form className="grid gap-2" onSubmit={event => {
        event.preventDefault();
        if (message.trim() && !busy) void update(message.trim());
      }}>
        <label>Reply to contributor<textarea className="field mt-2" value={message}
          onChange={event => setMessage(event.target.value)} maxLength={2000} /></label>
        <Button type="submit" disabled={busy || !message.trim()}>Send reply</Button>
      </form>}
    </>}
    {error && <p role="alert">{error}</p>}
  </div>;
}

function NeonReviewerPhoto({ id }: { id: string }) {
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);

  async function open() {
    setBusy(true);
    setFailed(false);
    try {
      const response = await reviewerFetch("?photo=" + encodeURIComponent(id));
      if (!response.ok || response.headers.get("content-type") !== "image/jpeg") throw new Error();
      setSource(URL.createObjectURL(await response.blob()));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return <div>
    <Button variant="outline" disabled={busy} onClick={() => source ? setSource("") : void open()}>
      {source ? "Close photo" : busy ? "Loading photo…" : "Open private photo"}
    </Button>
    {source && <img src={source} alt="Private report photo" className="mt-3 w-full max-h-96 object-contain" />}
    {failed && <p role="alert">The photo is unavailable or your access has changed.</p>}
  </div>;
}
