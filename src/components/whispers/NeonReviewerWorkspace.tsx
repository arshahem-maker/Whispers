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

async function reviewerFetch(photo?: string, signal?: AbortSignal) {
  const { data } = await neonAuthClient().getSession();
  if (!data?.session?.access_token) throw new Error("Sign in to continue.");
  return fetch(photo ? `/api/public/neon-reviewer?photo=${encodeURIComponent(photo)}` : "/api/public/neon-reviewer", {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    ...(signal ? { signal } : {}),
  });
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
        const response = await reviewerFetch(undefined, controller.signal);
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
          {report.photos.map((id) => <NeonReviewerPhoto key={id} id={id} />)}
        </article>
      ))}
    </section>
  );
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
      const response = await reviewerFetch(id);
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
