import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createMemoInstruction } from "@solana/spl-memo";
import bs58 from "bs58";

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.testnet.solana.com";
const CLUSTER = process.env.SOLANA_CLUSTER ?? "testnet";

type MemoResult =
  | { ok: true; signature: string; explorerUrl: string; memo: string }
  | { ok: false; error: string; memo: string };

let cachedSigner: Keypair | null = null;

function decodeSecret(raw: string): Uint8Array {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    const arr = JSON.parse(trimmed) as number[];
    return Uint8Array.from(arr);
  }
  return bs58.decode(trimmed);
}

function getSigner(): Keypair | null {
  if (cachedSigner) return cachedSigner;
  const secret = process.env.WALLET_A_SECRET;
  if (!secret) return null;
  try {
    const bytes = decodeSecret(secret);
    cachedSigner = Keypair.fromSecretKey(bytes);
    return cachedSigner;
  } catch (err) {
    console.error("[solana] failed to decode WALLET_A_SECRET:", err);
    return null;
  }
}

function getCustodyPubkey(): PublicKey | null {
  const pub = process.env.WALLET_B_PUBLIC;
  if (!pub) return null;
  try {
    return new PublicKey(pub);
  } catch {
    return null;
  }
}

export function explorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${encodeURIComponent(
    CLUSTER,
  )}`;
}

export function buildMemoPayload(input: {
  shipmentId: string;
  legIndex: number;
  fromNodeId: string;
  toNodeId: string;
  deviceId: string;
  eventId: string;
  timestamp: string;
}): string {
  return [
    "ReliefLink",
    `shipment=${input.shipmentId}`,
    `leg=${input.legIndex}`,
    `${input.fromNodeId}->${input.toNodeId}`,
    `device=${input.deviceId}`,
    `event=${input.eventId}`,
    `t=${input.timestamp}`,
  ].join(" | ");
}

/**
 * Submit a memo transaction to Solana testnet. Fails soft — returns an error
 * object rather than throwing so the caller can persist the transfer anyway.
 */
export async function submitMemo(memo: string): Promise<MemoResult> {
  const signer = getSigner();
  if (!signer) {
    return { ok: false, error: "WALLET_A_SECRET not configured", memo };
  }

  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const tx = new Transaction();

    const custody = getCustodyPubkey();
    if (custody && !custody.equals(signer.publicKey)) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: signer.publicKey,
          toPubkey: custody,
          lamports: 1,
        }),
      );
    }

    tx.add(createMemoInstruction(memo, [signer.publicKey]));

    const signature = await sendAndConfirmTransaction(connection, tx, [signer], {
      commitment: "confirmed",
      maxRetries: 3,
    });

    return { ok: true, signature, explorerUrl: explorerUrl(signature), memo };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[solana] submitMemo failed:", error);
    return { ok: false, error, memo };
  }
}
