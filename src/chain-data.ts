import { useQuery } from "@tanstack/react-query";
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, type Address, type PublicClient } from "viem";
import { usePublicClient, useReadContract, useReadContracts } from "wagmi";
import { companionAbi } from "./abi";
import { COMPANION_ADDRESS, DEPLOY_BLOCK, REFRESH_MS, chain } from "./config";

const companion = { address: COMPANION_ADDRESS, abi: companionAbi, chainId: chain.id } as const;

export type Activity = "running" | "napping" | "sleeping";
export const ACTIVITIES: readonly Activity[] = ["running", "napping", "sleeping"];
export const ACTIVITY_LABEL: Record<Activity, string> = { running: "Running", napping: "Napping", sleeping: "Sleeping" };

/** currentState(): (activity, squeekBlock, frontier), re-read every REFRESH_MS. */
export function useLiveState() {
  const q = useReadContract({ ...companion, functionName: "currentState", query: { refetchInterval: REFRESH_MS } });
  const data = q.data
    ? { activity: ACTIVITIES[q.data[0]] ?? "sleeping", squeekBlock: q.data[1], frontier: q.data[2] }
    : undefined;
  return { ...q, data };
}

/** publicMinted() and totalSupply() read together. */
export function useSupply() {
  const q = useReadContracts({
    contracts: [
      { ...companion, functionName: "publicMinted" },
      { ...companion, functionName: "totalSupply" },
    ],
    allowFailure: false,
    query: { refetchInterval: REFRESH_MS },
  });
  return { ...q, publicMinted: q.data ? Number(q.data[0]) : undefined, totalSupply: q.data ? Number(q.data[1]) : undefined };
}

export function useHasMinted(address: Address | undefined) {
  return useReadContract({
    ...companion,
    functionName: "hasMinted",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
}

const transferEvent = companionAbi.find((x) => x.type === "event" && x.name === "Transfer")!;

/** Transfer logs to `owner` since deployment, scanned in shrinking chunks when an RPC caps the range. */
async function transferIdsTo(client: PublicClient, owner: Address): Promise<bigint[]> {
  const latest = await client.getBlockNumber();
  const ids = new Set<bigint>();
  let from = DEPLOY_BLOCK;
  let span = latest - DEPLOY_BLOCK + 1n;
  while (from <= latest) {
    const to = from + span - 1n > latest ? latest : from + span - 1n;
    try {
      const logs = await client.getLogs({
        address: COMPANION_ADDRESS,
        event: transferEvent,
        args: { to: owner },
        fromBlock: from,
        toBlock: to,
      });
      for (const log of logs) if (log.args.tokenId !== undefined) ids.add(log.args.tokenId);
      from = to + 1n;
      if (span < 50_000n) span *= 2n;
    } catch (err) {
      if (span <= 500n) throw err;
      span = span > 50_000n ? 50_000n : span / 2n;
    }
  }
  return [...ids];
}

/**
 * The wallet's tokens. The collection has no ERC-721 Enumerable, so candidates come from
 * Transfer events to the wallet and ownerOf confirms which are still held.
 */
export function useOwnedTokens(owner: Address | undefined) {
  const client = usePublicClient({ chainId: chain.id });
  return useQuery({
    queryKey: ["owned", owner],
    enabled: Boolean(owner && client),
    refetchInterval: REFRESH_MS * 2,
    queryFn: async () => {
      const candidates = await transferIdsTo(client!, owner!);
      if (candidates.length === 0) return [];
      const owners = await client!.multicall({
        contracts: candidates.map((id) => ({ ...companion, functionName: "ownerOf" as const, args: [id] as const })),
        allowFailure: true,
      });
      return candidates
        .filter((_, i) => owners[i]?.status === "success" && String(owners[i]!.result).toLowerCase() === owner!.toLowerCase())
        .sort((a, b) => (a < b ? -1 : 1));
    },
  });
}

export type TokenMeta = {
  name: string;
  image: string;
  activity: Activity | undefined;
  squeekBlock: number | undefined;
  mintBlock: number | undefined;
};

type RawMeta = { name?: string; image?: string; attributes?: { trait_type: string; value: string | number }[] };

/** Decode tokenURI's data:application/json;base64 payload. The image stays a data URI for <img>. */
export function decodeTokenUri(uri: string): TokenMeta {
  const prefix = "data:application/json;base64,";
  const json = uri.startsWith(prefix)
    ? new TextDecoder().decode(Uint8Array.from(atob(uri.slice(prefix.length)), (c) => c.charCodeAt(0)))
    : decodeURIComponent(uri.slice(uri.indexOf(",") + 1));
  const raw = JSON.parse(json) as RawMeta;
  const trait = (t: string) => raw.attributes?.find((a) => a.trait_type === t)?.value;
  const state = String(trait("state") ?? "").toLowerCase();
  const num = (v: unknown) => (v === undefined || v === "" ? undefined : Number(v));
  return {
    name: raw.name ?? "",
    image: raw.image ?? "",
    activity: (ACTIVITIES as readonly string[]).includes(state) ? (state as Activity) : undefined,
    squeekBlock: num(trait("squeek_block")),
    mintBlock: num(trait("mint_block")),
  };
}

/**
 * Live metadata for one token. The settled frontier is part of the key, so every SqueekCore
 * settlement re-reads the art; nothing is persisted, and unused entries drop after a minute.
 */
export function useTokenMeta(id: bigint | undefined, frontier: bigint | undefined) {
  const client = usePublicClient({ chainId: chain.id });
  return useQuery({
    queryKey: ["tokenURI", id?.toString(), frontier?.toString()],
    enabled: id !== undefined && Boolean(client),
    refetchInterval: REFRESH_MS,
    gcTime: 60_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const uri = await client!.readContract({ ...companion, functionName: "tokenURI", args: [id!] });
      return decodeTokenUri(uri);
    },
  });
}

/** A plain sentence for a failed mint, naming the fix. */
export function mintErrorMessage(err: unknown): string {
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) {
      return "You declined the transaction in your wallet. Nothing was sent.";
    }
    const reverted = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name === "AlreadyMinted") return ALREADY_MINTED;
      if (name === "PublicSupplyExhausted") return "All 900 public companions have been minted.";
      if (name === "ERC721InvalidReceiver") return "This wallet cannot receive NFTs. Mint from a wallet that can hold ERC-721 tokens.";
    }
    const text = `${err.shortMessage} ${err.details ?? ""}`.toLowerCase();
    if (text.includes("insufficient funds")) {
      return "This wallet needs a little Sepolia ETH for gas. Get some from a Sepolia faucet, then try again.";
    }
    if (text.includes("rejected") || text.includes("denied")) return "You declined the transaction in your wallet. Nothing was sent.";
  }
  return "Unable to mint. Check your connection and try again.";
}

export const ALREADY_MINTED =
  "This wallet has already claimed its companion. Each wallet can mint once; your companion is under My companions.";
