import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageButton, LanguageProvider } from "./LanguagePicker";

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

  it("keeps the selector available for the legacy backend", async () => {
    vi.stubEnv("VITE_WHISPERS_REVIEWER_BACKEND", "supabase");

    render(<LanguageProvider><LanguageButton tiny /></LanguageProvider>);

    fireEvent.click(await screen.findByRole("button", { name: "Change language" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("keeps the Neon provider lightweight and leaves its children available", () => {
    vi.stubEnv("VITE_WHISPERS_REVIEWER_BACKEND", "neon");

    render(<LanguageProvider><p>Report content</p></LanguageProvider>);

    expect(screen.getByText("Report content")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
