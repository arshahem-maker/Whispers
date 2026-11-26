import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { CitizenShell } from "@/components/whispers/CitizenShell";
import { PilotWorkspace } from "@/components/whispers/PilotWorkspace";
import { useWhispers } from "@/lib/whispers/use-whispers";
import { generatePrivateCode, groupCode, hashCode } from "@/lib/whispers/crypto";
import { pilotReceipt, pilotUpload, submitPilotReport } from "@/lib/whispers/pilot.functions";
import { tr, useTranslationVersion } from "@/lib/whispers/translation";

export function LegacyPilot() {
  useTranslationVersion();
  const { draft } = useWhispers();
  const submit = useServerFn(submitPilotReport);
  const receipt = useServerFn(pilotReceipt);
  const upload = useServerFn(pilotUpload);
  const [tab, setTab] = useState("staff");
  const [fictional, setFictional] = useState(false);
  const [code, setCode] = useState("");
  const [held, setHeld] = useState<{ code: string; key: string } | null>(null);
  const [view, setView] = useState<Awaited<ReturnType<typeof pilotReceipt>>>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      if (!draft.basis || !draft.ack) throw new Error("Complete and review your report draft first.");
      const attempt = held ?? { code: generatePrivateCode(), key: crypto.randomUUID() };
      setHeld(attempt);
      await submit({
        data: {
          fictional: true,
          codeHash: await hashCode(attempt.code),
          idempotencyKey: attempt.key,
          payload: {
            text: draft.text,
            category: draft.category,
            knowledgeBasis: draft.basis,
            countryCode: (draft.country ?? "not_shared") as "UA" | "TD" | "other" | "not_shared",
            areaId: draft.area,
            timeBucket: draft.time ?? "not_sure",
            impacts: draft.impacts,
            publicSummaryPermission: draft.publicPermission,
            acknowledged: true,
          },
        },
      });
      for (const photo of draft.photos) {
        await upload({ data: { code: attempt.code, bytes: Array.from(photo.bytes), uploadId: photo.id } });
      }
      setCode(attempt.code);
      setView(await receipt({ data: { code: attempt.code, action: "open" } }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const open = async (action: "open" | "message" | "removal") => {
    setBusy(true);
    setError("");
    try {
      const result = await receipt({ data: { code, action, text } });
      setView(result);
      if (!result) setError("The code is invalid, expired, or temporarily rate-limited.");
      else setText("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <CitizenShell sensitive>
      <h1>{tr("Connected fictional pilot")}</h1>
      <p className="text-warning mt-3">{tr("Fictional information only. No live humanitarian review team is connected.")}</p>
      <div className="flex gap-3 border-b my-5 pb-3">
        <Button variant={tab === "citizen" ? "default" : "ghost"} onClick={() => setTab("citizen")}>{tr("Citizen")}</Button>
        <Button variant={tab === "staff" ? "default" : "ghost"} onClick={() => setTab("staff")}>{tr("Staff")}</Button>
      </div>
      {tab === "staff" ? <PilotWorkspace /> : <>
        <p className="hint">{tr("Current report draft")}</p>
        <p className="whitespace-pre-wrap mt-2">{draft.text || tr("No draft open")}</p>
        <label className="flex gap-3 mt-5 text-sm">
          <input type="checkbox" checked={fictional} onChange={(event) => setFictional(event.target.checked)} />
          {tr("I confirm this contains only fictional test information.")}
        </label>
        <Button className="mt-4" disabled={!fictional || busy || !draft.text || !draft.ack} onClick={() => void save()}>{tr("Save fictional report to Cloud")}</Button>
        {held && view && <p className="font-mono break-all mt-5">{groupCode(held.code)}</p>}
        <label className="label block mt-8">{tr("Private code")}
          <input className="field mt-2" type="password" autoComplete="off" value={code} onChange={(event) => setCode(event.target.value)} />
        </label>
        <Button disabled={busy || !code} className="mt-3" variant="secondary" onClick={() => void open("open")}>{tr("Open saved pilot report")}</Button>
        {view && <section className="mt-6">
          <p className="whitespace-pre-wrap">{view.text}</p>
          <p className="hint mt-2">{view.area} · {view.state}</p>
          {view.messages.map((message) => <p key={message.id} className="mt-3"><span className="hint">{message.sender}: </span>{message.text}</p>)}
          <textarea aria-label={tr("Additional information")} className="field mt-4" value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} />
          <div className="flex flex-wrap gap-2 mt-3">
            <Button disabled={busy || !text || view.removalRequested} onClick={() => void open("message")}>{tr("Send additional information")}</Button>
            <Button variant="outline" disabled={busy || view.removalRequested} onClick={() => void open("removal")}>{tr("Request removal")}</Button>
          </div>
        </section>}
      </>}
      {error && <p role="alert" className="text-destructive mt-4">{tr(error)}</p>}
    </CitizenShell>
  );
}
