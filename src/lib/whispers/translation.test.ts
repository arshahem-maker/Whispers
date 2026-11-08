import { afterEach, describe, expect, it } from "vitest";
import { installTranslations, tr } from "./translation";
import { t } from "./i18n";
import catalog from "./interface-catalog.json";
import { PRIORITY_LANGUAGES } from "./languages";

afterEach(() => installTranslations({}));
describe("interface translation boundaries", () => {
  it("preserves private content that is not in the static phrase dictionary", () => {
    installTranslations({ "Updates": "تحديثات" });
    expect(tr("Private fictional report: a clinic is closed")).toBe("Private fictional report: a clinic is closed");
    expect(tr("ABCD-EFGH-1234-5678")).toBe("ABCD-EFGH-1234-5678");
  });
  it("preserves numeric placeholders when applying a translated phrase", () => {
    installTranslations({ "Step {n} of 3": "الخطوة {n} من 3" });
    expect(t("step.of", { n: 2 })).toBe("الخطوة 2 من 3");
  });
  it("restores original English without replacing private content", () => {
    installTranslations({ "Updates": "تحديثات" });
    expect(tr("Updates")).toBe("تحديثات");
    installTranslations({});
    expect(tr("Updates")).toBe("Updates");
  });
  it("includes priority languages with correct writing directions", () => {
    expect(PRIORITY_LANGUAGES.find((l) => l.code === "ar")?.rtl).toBe(true);
    expect(PRIORITY_LANGUAGES.find((l) => l.code === "uk")?.rtl).toBe(false);
    expect(catalog.includes("ABCD-EFGH-1234-5678")).toBe(false);
  });
});