import { neonDatabase } from "./database.server";

const requiredReviewKinds = ["translation", "security", "legal", "safeguarding", "operations"] as const;
const stagingDatabaseHosts = new Set([
  "ep-blue-thunder-bgfcd7v8.c-9.eu-central-1.aws.neon.tech",
  "ep-blue-thunder-bgfcd7v8-pooler.c-9.eu-central-1.aws.neon.tech",
]);

export function partnerDemoRealIntakeEnabled() {
  if (process.env["WHISPERS_PARTNER_DEMO_REAL_INTAKE_ENABLED"] !== "true") return false;
  const testers = (process.env["WHISPERS_PILOT_TESTER_IDS"] ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  if (testers.length !== 1) return false;
  try {
    const host = new URL(process.env["DATABASE_URL"] ?? process.env["DATABASE_URL_UNPOOLED"] ?? "").hostname;
    return stagingDatabaseHosts.has(host);
  } catch {
    return false;
  }
}

interface ReleaseRow {
  live_intake: boolean;
  operator_name: string | null;
  operator_contact: string | null;
  operator_user_id: string | null;
}

interface ReviewRow {
  kind: string;
  reviewer_id: string;
  reference: string;
}

export async function liveIntakeReadiness() {
  if (process.env["WHISPERS_LIVE_INTAKE_ENABLED"] !== "true") {
    return {
      ready: false,
      enabled: false,
      partnerDemo: partnerDemoRealIntakeEnabled(),
      missing: ["server_enable_flag"] as string[],
    };
  }

  try {
    return await neonDatabase().begin(async (sql) => {
      const [release] = await sql<ReleaseRow[]>`
        select live_intake, operator_name, operator_contact, operator_user_id
        from public.whispers_release where id='pilot'
      `;
      const reviews = await sql<ReviewRow[]>`
        select kind, reviewer_id, reference from public.whispers_release_reviews
      `;
      const missing: string[] = [];
      if (!release?.operator_name?.trim() || !release.operator_contact?.trim() || !release.operator_user_id) {
        missing.push("named_operator");
      }
      for (const kind of requiredReviewKinds) {
        if (!reviews.some((review) => review.kind === kind && review.reference.trim())) missing.push(kind);
      }
      const independentReviewers = new Set(reviews
        .filter((review) => review.reviewer_id !== release?.operator_user_id && review.reference.trim())
        .map((review) => review.reviewer_id));
      if (independentReviewers.size < 2) missing.push("two_independent_reviewers");
      const ready = missing.length === 0;
      return {
        ready,
        enabled: ready && release?.live_intake === true,
        partnerDemo: partnerDemoRealIntakeEnabled(),
        missing,
      };
    });
  } catch {
    // Missing schema or unavailable database must never be interpreted as approval.
    return { ready: false, enabled: false, partnerDemo: partnerDemoRealIntakeEnabled(), missing: ["release_state_unavailable"] as string[] };
  }
}

export async function currentNeonIntakeStatus() {
  const readiness = await liveIntakeReadiness();
  return {
    mode: readiness.enabled || readiness.partnerDemo ? "real" as const : "fictional" as const,
    partnerDemo: readiness.partnerDemo,
  };
}

export async function currentNeonIntakeMode() {
  return (await currentNeonIntakeStatus()).mode;
}

export async function requireNeonIntakeMode(fictional: boolean) {
  const mode = await currentNeonIntakeMode();
  if (fictional !== (mode === "fictional")) {
    throw new Error(mode === "real"
      ? "Real intake is active for this authorized pilot. Refresh before submitting."
      : "Real intake is closed until its operator and independent release reviews are approved.");
  }
  return mode;
}

export { requiredReviewKinds };
