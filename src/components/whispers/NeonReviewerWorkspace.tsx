import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { RetentionCommand } from "@/integrations/neon/retention-admin.server";
import type { NeonInvitationCommand } from "@/lib/whispers/staff-invitations";
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
        if (response.status === 403) {
          setError("A reviewer role is required. If you were invited, accept your invitation below.");
          return;
        }
        if (!response.ok) throw new Error("Unable to load reviewer access.");
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

  async function acceptInvitations() {
    setBusy(true);
    setError("");
    try {
      const response = await reviewerFetch("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptInvitations: true }),
      });
      if (!response.ok) throw new Error("Unable to check invitations.");
      const { accepted } = await response.json() as { accepted: number };
      const updated = await reviewerFetch();
      if (updated.ok) {
        const { reports: refreshed } = await updated.json() as { reports: ReportSummary[] };
        setReports(refreshed);
      } else {
        setError(accepted ? "Invitation accepted. This page requires a reviewer role." : "No active invitation matched your verified email.");
      }
    } catch {
      setError("Unable to check invitations. Try again.");
    } finally {
      setBusy(false);
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
      {signedIn && <Button variant="outline" onClick={() => void acceptInvitations()}>Accept staff invitations</Button>}
      {signedIn && <><NeonInvitationAdmin /><NeonRetentionAdmin onRemoved={id => setReports(items => items.filter(item => item.id !== id))} /></>}
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

interface InvitationAdminData {
  scopes: Extract<NeonInvitationCommand, { action: "invite_staff" }>["invitation"]["workspace"][];
  invitations: {
    id: string; email: string; role: string; workspace: string;
    expires_at: string; accepted_at: string | null; revoked_at: string | null;
  }[];
}

function NeonInvitationAdmin() {
  const [data, setData] = useState<InvitationAdminData>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void reviewerFetch("?invitations", { signal: controller.signal }).then(async (response) => {
      if (response.ok) setData(await response.json() as InvitationAdminData);
      else if (response.status !== 403) throw new Error();
    }).catch(() => {
      if (!controller.signal.aborted) setError("Unable to check invitation management access.");
    });
    return () => controller.abort();
  }, []);

  async function update(command: NeonInvitationCommand) {
    setBusy(true);
    setError("");
    try {
      const response = await reviewerFetch("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      if (!response.ok) throw new Error();
      const refreshed = await reviewerFetch("?invitations");
      if (!refreshed.ok) throw new Error();
      setData(await refreshed.json() as InvitationAdminData);
    } catch {
      setError("Could not update invitations. Refresh and check your access.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) return error ? <p role="alert">{error}</p> : null;
  return <section className="card grid gap-3 p-4">
    <h2>Manage staff invitations</h2>
    <form className="grid gap-2" onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const workspace = data.scopes.find(scope => scope === form.get("workspace"));
      const role = form.get("role");
      const email = String(form.get("email") ?? "");
      if (!busy && workspace && (role === "reviewer" || role === "expert") && email) {
        void update({ action: "invite_staff", invitation: { email, role, workspace } });
      }
    }}>
      <label>Email<input name="email" className="field" type="email" maxLength={254} required /></label>
      <label>Role<select name="role" className="field">
        <option value="reviewer">Reviewer</option><option value="expert">Expert</option>
      </select></label>
      <label>Workspace<select name="workspace" className="field">
        {data.scopes.map(scope => <option key={scope} value={scope}>{scope}</option>)}
      </select></label>
      <Button disabled={busy} type="submit">Create invitation</Button>
    </form>
    {data.invitations.map(invitation => {
      const state = invitation.accepted_at ? "Accepted" : invitation.revoked_at ? "Revoked"
        : Date.parse(invitation.expires_at) <= Date.now() ? "Expired" : "Pending";
      return <div className="border-t pt-2" key={invitation.id}>
        <p>{invitation.email} · {invitation.role} · {invitation.workspace} · {state}</p>
        {state === "Pending" && <Button disabled={busy} variant="outline" onClick={() =>
          void update({ action: "revoke_invitation", id: invitation.id })}>Revoke invitation</Button>}
      </div>;
    })}
    {error && <p role="alert">{error}</p>}
  </section>;
}

interface RetentionReport {
  id: string;
  workspace: string;
  expires_at: string;
  removal_requested_at: string | null;
}

function NeonRetentionAdmin({ onRemoved }: { onRemoved: (id: string) => void }) {
  const [reports, setReports] = useState<RetentionReport[]>();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void reviewerFetch("?retention", { signal: controller.signal }).then(async response => {
      if (response.ok) setReports((await response.json() as { reports: RetentionReport[] }).reports);
      else if (response.status !== 403) throw new Error();
    }).catch(() => {
      if (!controller.signal.aborted) setError("Unable to load the retention queue.");
    });
    return () => controller.abort();
  }, []);

  async function save(command: RetentionCommand) {
    setBusy(true);
    setError("");
    try {
      const response = await reviewerFetch("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      if (!response.ok) throw new Error();
      if ("removalId" in command) onRemoved(command.removalId);
      const refreshed = await reviewerFetch("?retention");
      if (!refreshed.ok) throw new Error();
      setReports((await refreshed.json() as { reports: RetentionReport[] }).reports);
      setSelected("");
    } catch {
      setError("Could not update retention. Refresh and check the report status.");
    } finally {
      setBusy(false);
    }
  }

  if (!reports) return error ? <p role="alert">{error}</p> : null;
  return <section className="card grid gap-3 p-4">
    <h2>Private report retention</h2>
    {reports.length === 0 && <p>No reports in your workspaces need review.</p>}
    {reports.map(report => <article key={report.id} className="grid gap-2 border-t pt-2">
      <p className="break-all">{report.workspace} · {report.id}</p>
      <p>Expires {new Date(report.expires_at).toLocaleDateString()}
        {report.removal_requested_at && " · Removal requested"}</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} variant="outline" onClick={() => {
          if (window.confirm("Remove this report and revoke access to its private attachments?")) {
            void save({ removalId: report.id });
          }
        }}>Remove report</Button>
        {!report.removal_requested_at && <Button disabled={busy} variant="outline"
          onClick={() => setSelected(selected === report.id ? "" : report.id)}>Set next review</Button>}
      </div>
      {selected === report.id && <form className="grid gap-2" onSubmit={event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const date = new Date(String(form.get("review") ?? ""));
        const reason = String(form.get("reason") ?? "").trim();
        const delay = date.getTime() - Date.now();
        if (!(delay > 0 && delay <= 30 * 86_400_000) || !reason) {
          setError("Set a review time within 30 days and enter a reason.");
          return;
        }
        void save({ extensionId: report.id, nextReview: date.toISOString(), reason });
      }}>
        <label>Next review<input className="field" type="datetime-local" name="review" required /></label>
        <label>Reason<textarea className="field" name="reason" maxLength={2000} required /></label>
        <Button disabled={busy} type="submit">Save review date</Button>
      </form>}
    </article>)}
    {error && <p role="alert">{error}</p>}
  </section>;
}

interface ReportDetail {
  report: { text: string | null; state: string | null; removal_requested_at: string | null };
  messages: { id: string; kind: string; text: string; sender: string }[];
}

function NeonReportDetail({ id }: { id: string }) {
  const [detail, setDetail] = useState<ReportDetail>();
  const [message, setMessage] = useState("");
  const [privateNote, setPrivateNote] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function update(command?: { reply: string } | { note: string } | { state: string }) {
    setBusy(true);
    setError("");
    try {
      const response = command === undefined
        ? await reviewerFetch("?report=" + encodeURIComponent(id))
        : await reviewerFetch("", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId: id, ...command }),
        });
      if (response.status === 409) throw new Error("A removal request is pending.");
      if (!response.ok) throw new Error("The report is unavailable or your access has changed.");
      setDetail(await response.json() as ReportDetail);
      if (command && !("state" in command)) setMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The report is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="grid gap-2">
    <Button variant="outline" disabled={busy} onClick={() => {
      if (detail) { setDetail(undefined); setMessage(""); setPrivateNote(false); setError(""); }
      else void update();
    }}>{detail ? "Close report" : "Read report"}</Button>
    {detail && <>
      <p className="whitespace-pre-wrap">{detail.report.text}</p>
      <label>Review status<select className="field" disabled={busy || Boolean(detail.report.removal_requested_at)}
        value={detail.report.state ?? "received"} onChange={event => void update({ state: event.target.value })}>
        <option value="received" disabled>Received</option>
        <option value="in_review">In review</option>
        <option value="awaiting_contributor">Awaiting contributor</option>
        <option value="awaiting_expert">Awaiting expert</option>
        <option value="complete">Complete</option>
      </select></label>
      {detail.messages.map(item => <p key={item.id} className="whitespace-pre-wrap">
        <strong>{item.kind === "note" ? "Private staff note" : item.sender}:</strong> {item.text}
      </p>)}
      {!detail.report.removal_requested_at && <form className="grid gap-2" onSubmit={event => {
        event.preventDefault();
        if (message.trim() && !busy) void update(privateNote ? { note: message.trim() } : { reply: message.trim() });
      }}>
        <label className="flex items-center gap-2"><input type="checkbox" checked={privateNote}
          onChange={event => setPrivateNote(event.target.checked)} /> Private staff note</label>
        <label>{privateNote ? "Staff note" : "Reply to contributor"}<textarea className="field mt-2" value={message}
          onChange={event => setMessage(event.target.value)} maxLength={2000} /></label>
        <Button type="submit" disabled={busy || !message.trim()}>{privateNote ? "Save note" : "Send reply"}</Button>
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
