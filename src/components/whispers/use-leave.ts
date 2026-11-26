import { useNavigate } from "@tanstack/react-router";
import { useWhispers } from "@/lib/whispers/use-whispers";

export function useLeave() {
  const { wipe } = useWhispers();
  const navigate = useNavigate();
  return () => {
    wipe();
    document.querySelectorAll("dialog[open]").forEach((dialog) => (dialog as HTMLDialogElement).close());
    navigate({ to: "/closed", replace: true });
  };
}
