import { toast } from "sonner";

export type LedgerStep = {
  label: string;
  minMs?: number;
  maxMs?: number;
};

const DEFAULT_STEPS: LedgerStep[] = [
  { label: "Connecting to device…" },
  { label: "Verifying driver credentials…" },
  { label: "Signing handoff payload…" },
  { label: "Anchoring on Solana…" },
];

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function pickDuration(step: LedgerStep): number {
  const min = step.minMs ?? 350;
  const max = step.maxMs ?? 900;
  return Math.round(min + Math.random() * (max - min));
}

/**
 * Runs a fake "chain-of-custody" animation as a Sonner toast while the real
 * request runs in parallel. Resolves with the request result once both the
 * minimum animation time and the request have completed.
 */
export async function runStagedLedgerUi<T>({
  steps = DEFAULT_STEPS,
  run,
  successLabel = "Anchored on Solana.",
  errorLabel = "Ledger anchor failed.",
}: {
  steps?: LedgerStep[];
  run: () => Promise<T>;
  successLabel?: string;
  errorLabel?: string;
}): Promise<T> {
  const toastId = toast.loading(steps[0]?.label ?? "Working…");

  const animation = (async () => {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      toast.loading(step.label, { id: toastId });
      await delay(pickDuration(step));
    }
  })();

  try {
    const [result] = await Promise.all([run(), animation]);
    toast.success(successLabel, { id: toastId });
    return result;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : errorLabel, { id: toastId });
    throw err;
  }
}
