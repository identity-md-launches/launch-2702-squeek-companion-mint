import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { parseEventLogs, type Hash } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { companionAbi } from "./abi";
import {
  ACTIVITY_LABEL,
  ALREADY_MINTED,
  mintErrorMessage,
  useHasMinted,
  useLiveState,
  useOwnedTokens,
  useSupply,
  useTokenMeta,
  type Activity,
} from "./chain-data";
import { COMPANION_ADDRESS, EXPLORER, PUBLIC_SUPPLY, REFRESH_MS, SOURCE_REPO, chain } from "./config";
import { ConnectControl, useConnectSheet } from "./ConnectSheet";
import running from "./assets/previews/running.svg";
import napping from "./assets/previews/napping.svg";
import sleeping from "./assets/previews/sleeping.svg";

const PREVIEW: Record<Activity, string> = { running, napping, sleeping };
const fmt = (n: number | bigint) => n.toLocaleString("en-US");

export function App() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="top">
        <a className="brand" href="#main">
          <img src="./favicon.svg" width={28} height={28} alt="" />
          <span>Squeek Companion</span>
        </a>
        <nav aria-label="Sections" className="nav">
          <a href="#companions">My companions</a>
          <a href="#how">How it works</a>
        </nav>
        <ConnectControl />
      </header>
      <main id="main" tabIndex={-1}>
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">A hamster that follows the wheel</h1>
            <p className="lede">
              Mint a free on-chain pixel hamster on Sepolia. Its art runs, naps or sleeps with Squeekchain's wheel.
            </p>
            <MintPanel />
          </div>
          <LiveStatus />
        </section>
        <Gallery />
        <HowItWorks />
      </main>
      <footer className="foot wrap">
        <p>
          Contract{" "}
          <a href={`${EXPLORER}/address/${COMPANION_ADDRESS}`} target="_blank" rel="noreferrer">
            <bdi className="mono-num">{COMPANION_ADDRESS.slice(0, 10)}…{COMPANION_ADDRESS.slice(-6)}</bdi> on Sepolia Etherscan
          </a>
        </p>
        <p>
          <a href={SOURCE_REPO} target="_blank" rel="noreferrer">
            Read the contract source on GitHub
          </a>
        </p>
        <p className="muted">Sepolia testnet only. No rewards, no upkeep, no approvals.</p>
      </footer>
    </>
  );
}

type MintStatus =
  | { kind: "idle" }
  | { kind: "confirm" }
  | { kind: "pending"; hash: Hash }
  | { kind: "done"; hash: Hash; tokenId: bigint }
  | { kind: "error"; message: string };

function MintPanel() {
  const { address, isConnected, chainId } = useAccount();
  const { openSheet } = useConnectSheet();
  const { switchChain, isPending: switching, error: switchError } = useSwitchChain();
  const client = usePublicClient({ chainId: chain.id });
  const queryClient = useQueryClient();
  const supply = useSupply();
  const claimed = useHasMinted(address);
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<MintStatus>({ kind: "idle" });

  const minted = supply.publicMinted;
  const soldOut = minted !== undefined && minted >= PUBLIC_SUPPLY;
  const wrongChain = isConnected && chainId !== chain.id;
  const busy = status.kind === "confirm" || status.kind === "pending";

  async function mint() {
    if (!address || !client) return;
    // A claimed wallet is told so before anything reaches the wallet.
    if (claimed.data === true) {
      setStatus({ kind: "error", message: ALREADY_MINTED });
      return;
    }
    setStatus({ kind: "confirm" });
    try {
      // Simulate first: a revert (already claimed, sold out) surfaces here, not as a failed transaction.
      await client.simulateContract({ address: COMPANION_ADDRESS, abi: companionAbi, functionName: "mint", account: address });
      const hash = await writeContractAsync({ address: COMPANION_ADDRESS, abi: companionAbi, functionName: "mint", chainId: chain.id });
      setStatus({ kind: "pending", hash });
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("reverted");
      const transfer = parseEventLogs({ abi: companionAbi, eventName: "Transfer", logs: receipt.logs }).find(
        (l) => l.address.toLowerCase() === COMPANION_ADDRESS && l.args.to.toLowerCase() === address.toLowerCase(),
      );
      setStatus({ kind: "done", hash, tokenId: transfer?.args.tokenId ?? 0n });
    } catch (err) {
      setStatus({ kind: "error", message: mintErrorMessage(err) });
    } finally {
      void queryClient.invalidateQueries();
    }
  }

  let note: string;
  let action: JSX.Element;
  if (!isConnected) {
    note = "Connect a wallet to check whether it can claim.";
    action = (
      <button type="button" className="btn btn-primary btn-wide" onClick={openSheet}>
        Connect wallet
      </button>
    );
  } else if (wrongChain) {
    note = switchError
      ? "The wallet did not switch. Approve Sepolia in your wallet, then try again."
      : "Your wallet is on another network. Switch to Sepolia to mint.";
    action = (
      <button type="button" className="btn btn-primary btn-wide" disabled={switching} onClick={() => switchChain({ chainId: chain.id })}>
        {switching ? "Switching…" : "Switch to Sepolia"}
      </button>
    );
  } else {
    note = soldOut
      ? "All 900 public companions have been minted."
      : claimed.isPending
        ? "Checking this wallet's claim…"
        : claimed.data
          ? "This wallet has used its one claim."
          : "This wallet can claim one companion. Minting is free; you pay only Sepolia gas.";
    action = (
      <button type="button" className="btn btn-primary btn-wide" disabled={busy || soldOut} onClick={mint}>
        {status.kind === "confirm" ? "Confirm in your wallet…" : status.kind === "pending" ? "Minting…" : "Mint companion"}
      </button>
    );
  }

  return (
    <div className="panel mint" aria-labelledby="mint-title">
      <h2 id="mint-title" className="visually-hidden">
        Mint
      </h2>
      <div className="progress-head">
        <span>Public supply</span>
        <span className="num">
          {minted === undefined ? "Loading…" : `${fmt(minted)} of ${fmt(PUBLIC_SUPPLY)} minted`}
        </span>
      </div>
      <progress className="bar" max={PUBLIC_SUPPLY} value={minted ?? 0} aria-label="Public companions minted" />
      {supply.isError && <p className="msg msg-error">Unable to read supply. Check your connection; it retries every 30 seconds.</p>}
      <p className="note">{note}</p>
      {action}
      <div role="status" className="mint-result">
        {status.kind === "pending" && (
          <p className="msg">
            Waiting for Sepolia to confirm.{" "}
            <a href={`${EXPLORER}/tx/${status.hash}`} target="_blank" rel="noreferrer">
              View the transaction on Etherscan
            </a>
          </p>
        )}
        {status.kind === "done" && (
          <p className="msg msg-ok">
            Companion <strong className="num">#{status.tokenId.toString()}</strong> is yours.{" "}
            <a href="#companions">See it in My companions</a> or{" "}
            <a href={`${EXPLORER}/tx/${status.hash}`} target="_blank" rel="noreferrer">
              view the transaction
            </a>
            .
          </p>
        )}
        {status.kind === "error" && <p className="msg msg-error">{status.message}</p>}
      </div>
    </div>
  );
}

function StateBadge({ activity }: { activity: Activity }) {
  return (
    <span className={`badge badge-${activity}`}>
      <span className="dot" aria-hidden="true" />
      {ACTIVITY_LABEL[activity]}
    </span>
  );
}

function LiveStatus() {
  const live = useLiveState();
  // Token 1 is a reserve token that always exists; its tokenURI is the live art for everyone.
  const art = useTokenMeta(1n, live.data?.frontier);
  const updated = live.dataUpdatedAt ? new Date(live.dataUpdatedAt).toLocaleTimeString("en-US") : undefined;
  const activity = live.data?.activity;
  const src = art.data?.image || (activity ? PREVIEW[activity] : undefined);

  return (
    <section className="panel live" aria-labelledby="live-title">
      <div className="art-frame">
        {src ? (
          <img src={src} width={320} height={360} alt={activity ? `Squeek Companion art, ${ACTIVITY_LABEL[activity].toLowerCase()}` : ""} />
        ) : (
          <div className="art-skeleton" aria-hidden="true" />
        )}
      </div>
      <div className="live-body">
        <h2 id="live-title">Squeektoshi right now</h2>
        {live.isError && !live.data ? (
          <p className="msg msg-error">Unable to read the hamster's state. Retrying every 30 seconds.</p>
        ) : (
          <dl className="facts">
            <div>
              <dt>State</dt>
              <dd>{activity ? <StateBadge activity={activity} /> : "Loading…"}</dd>
            </div>
            <div>
              <dt>Squeek block</dt>
              <dd className="num">{live.data ? fmt(live.data.squeekBlock) : "…"}</dd>
            </div>
            <div>
              <dt>Settled round</dt>
              <dd className="num">{live.data ? fmt(live.data.frontier) : "…"}</dd>
            </div>
          </dl>
        )}
        <p className="muted small" aria-live="off">
          {updated ? `Read from currentState() at ${updated}. ` : ""}Refreshes every {REFRESH_MS / 1000} seconds.
        </p>
        <button type="button" className="btn btn-quiet" disabled={live.isFetching} onClick={() => void live.refetch()}>
          {live.isFetching ? "Refreshing…" : "Refresh now"}
        </button>
      </div>
    </section>
  );
}

function Gallery() {
  const { address, isConnected, chainId } = useAccount();
  const { openSheet } = useConnectSheet();
  const owned = useOwnedTokens(address);
  const live = useLiveState();
  const ids = owned.data ?? [];

  let body: JSX.Element;
  if (!isConnected) {
    body = (
      <div className="empty">
        <p className="empty-title">No wallet connected</p>
        <p className="muted">Connect to see every companion your wallet holds, with its live art.</p>
        <button type="button" className="btn btn-ghost" onClick={openSheet}>
          Connect wallet
        </button>
      </div>
    );
  } else if (owned.isPending) {
    body = (
      <ul className="grid" aria-busy="true" aria-label="Loading companions">
        {[0, 1, 2].map((i) => (
          <li key={i} className="card">
            <div className="art-skeleton" aria-hidden="true" />
          </li>
        ))}
      </ul>
    );
  } else if (owned.isError) {
    body = (
      <div className="empty">
        <p className="msg msg-error">Unable to load your companions. Check your connection and try again.</p>
        <button type="button" className="btn btn-ghost" onClick={() => void owned.refetch()}>
          Try again
        </button>
      </div>
    );
  } else if (ids.length === 0) {
    body = (
      <div className="empty">
        <p className="empty-title">No companions yet</p>
        <p className="muted">This wallet holds none. Each wallet can mint one for free.</p>
        <a className="btn btn-ghost" href="#main">
          Go to mint
        </a>
      </div>
    );
  } else {
    body = (
      <ul className="grid">
        {ids.map((id) => (
          <CompanionCard key={id.toString()} id={id} frontier={live.data?.frontier} />
        ))}
      </ul>
    );
  }

  return (
    <section id="companions" className="section wrap" aria-labelledby="companions-title">
      <div className="section-head">
        <h2 id="companions-title">My companions</h2>
        {isConnected && ids.length > 0 && (
          <p className="muted num">
            {ids.length === 1 ? "1 companion" : `${fmt(ids.length)} companions`}
            {chainId !== chain.id ? " (read from Sepolia)" : ""}
          </p>
        )}
      </div>
      <p className="muted section-lede">Art is re-read from tokenURI every 30 seconds and after each Squeekchain settlement.</p>
      {body}
    </section>
  );
}

function CompanionCard({ id, frontier }: { id: bigint; frontier: bigint | undefined }) {
  const meta = useTokenMeta(id, frontier);
  const m = meta.data;
  return (
    <li className="card">
      <div className="art-frame">
        {m?.image ? (
          <img src={m.image} width={320} height={360} loading="lazy" alt={`Companion #${id}, ${m.activity ? ACTIVITY_LABEL[m.activity].toLowerCase() : "live art"}`} />
        ) : (
          <div className="art-skeleton" aria-hidden="true" />
        )}
      </div>
      <h3 className="num">Companion #{id.toString()}</h3>
      {meta.isError && !m ? (
        <p className="msg msg-error">Unable to read this token's art. It retries every 30 seconds.</p>
      ) : (
        <dl className="facts facts-compact">
          <div>
            <dt>State</dt>
            <dd>{m?.activity ? <StateBadge activity={m.activity} /> : "…"}</dd>
          </div>
          <div>
            <dt>Squeek block</dt>
            <dd className="num">{m?.squeekBlock !== undefined ? fmt(m.squeekBlock) : "…"}</dd>
          </div>
          <div>
            <dt>Mint block</dt>
            <dd className="num">{m?.mintBlock !== undefined ? fmt(m.mintBlock) : "…"}</dd>
          </div>
        </dl>
      )}
      <a href={`${EXPLORER}/nft/${COMPANION_ADDRESS}/${id}`} target="_blank" rel="noreferrer">
        View #{id.toString()} on Etherscan
      </a>
    </li>
  );
}

const STATES: { activity: Activity; text: string }[] = [
  { activity: "running", text: "Squeekchain settled wheel work in one of the last 3 rounds. Eyes open, wheel turning, warm gold." },
  { activity: "napping", text: "No work in the last 3 rounds, but some within the last 12. Eyes closed and a Zzz on a blue night." },
  { activity: "sleeping", text: "No work in the last 12 settled rounds. Eyes closed under a pixel moon on a deeper night." },
];

function HowItWorks() {
  return (
    <section id="how" className="section wrap" aria-labelledby="how-title">
      <h2 id="how-title">How it works</h2>
      <p className="muted section-lede">
        Every companion draws itself from SqueekCore each time its tokenURI is read. The same hamster can be in any of three states.
      </p>
      <ul className="grid states">
        {STATES.map((s) => (
          <li key={s.activity} className="card">
            <div className="art-frame">
              <img src={PREVIEW[s.activity]} width={320} height={360} loading="lazy" alt={`Preview art, ${ACTIVITY_LABEL[s.activity].toLowerCase()}`} />
            </div>
            <h3>
              <StateBadge activity={s.activity} />
            </h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ul>
      <ul className="facts-list">
        <li>
          <strong>Free, one per wallet.</strong> mint() costs nothing but Sepolia gas, and each wallet gets one lifetime claim. IDs
          100 to 999 are public; 1 to 99 are the reserve.
        </li>
        <li>
          <strong>Fully on-chain.</strong> The JSON and SVG are built by the contract on every read. Nothing is hosted, so nothing can
          go missing.
        </li>
        <li>
          <strong>Settled rounds, not wall time.</strong> If Squeekchain stops settling, your hamster keeps its last state instead of
          drifting to sleep.
        </li>
        <li>
          <strong>Only one transaction.</strong> This site asks your wallet for the mint and nothing else: no signatures, no approvals.
        </li>
      </ul>
    </section>
  );
}
