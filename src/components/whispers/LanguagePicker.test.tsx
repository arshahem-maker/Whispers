import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageButton } from "./LanguagePicker";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("LanguageButton", () => {
  it("shows English-only status in the Neon pilot instead of a failing selector", () => {
    vi.stubEnv("VITE_WHISPERS_REVIEWER_BACKEND", "neon");

    render(<LanguageButton tiny />);

    expect(screen.getByLabelText("Language: English only")).toHaveTextContent("English only");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps the selector available for the legacy backend", () => {
    vi.stubEnv("VITE_WHISPERS_REVIEWER_BACKEND", "supabase");

    render(<LanguageButton tiny />);

    expect(screen.getByRole("button", { name: "Change language" })).toBeInTheDocument();
  });
});
