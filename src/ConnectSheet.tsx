import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getAddress } from "viem";
import { useAccount, useConnect, useDisconnect, useSwitchChain, type Connector } from "wagmi";
import { chain } from "./config";
import { OPEN_IN, isMobileBrowser } from "./open-in";
import { WALLET_ICONS } from "./wallet-icons";

const short = (a: string) => {
  const c = getAddress(a);
  return `${c.slice(0, 6)}…${c.slice(-4)}`;
};
const markSrc = (id: string) =>
  WALLET_ICONS[id] ? `data:image/svg+xml;utf8,${encodeURIComponent(WALLET_ICONS[id]!)}` : undefined;

const SheetContext = createContext<{ openSheet: () => void }>({ openSheet: () => {} });

/** Any control on the page can open the one wallet sheet. */
export const useConnectSheet = () => useContext(SheetContext);

export function ConnectSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ openSheet: () => setOpen(true) }), []);
  // Stable, so the sheet's focus effect runs once per opening.
  const close = useCallback(() => setOpen(false), []);
  return (
    <SheetContext.Provider value={value}>
      {children}
      {open && <ConnectSheet onClose={close} />}
    </SheetContext.Provider>
  );
}

/** The header control: Connect, then "Switch to Sepolia" on the wrong chain, then the short address. */
export function ConnectControl() {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { openSheet } = useConnectSheet();
  const [menu, setMenu] = useState(false);

  if (isConnected && address && chainId !== chain.id) {
    return (
      <div className="account">
        <button type="button" className="btn btn-primary" disabled={switching} onClick={() => switchChain({ chainId: chain.id })}>
          {switching ? "Switching…" : `Switch to ${chain.name}`}
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }
  if (isConnected && address) {
    return (
      <div className="account">
        <button type="button" className="btn btn-ghost addr" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          {short(address)}
        </button>
        {menu && (
          <button type="button" className="btn btn-quiet" onClick={() => { setMenu(false); disconnect(); }}>
            Disconnect
          </button>
        )}
      </div>
    );
  }
  return (
    <button type="button" className="btn btn-ghost" onClick={openSheet}>
      Connect
    </button>
  );
}

/** The wallet picker: the site's own type and colors, the network's structure. */
function ConnectSheet({ onClose }: { onClose: () => void }) {
  const mobile = isMobileBrowser();
  const { isConnected } = useAccount();
  const { connectors, connect, isPending, variables, error, reset } = useConnect();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus moves into the sheet, the page behind goes inert, focus returns to the trigger on close.
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const root = document.getElementById("root");
    root?.setAttribute("inert", "");
    dialogRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      root?.removeAttribute("inert");
      trigger?.focus();
    };
  }, [onClose]);
  useEffect(() => {
    if (isConnected) onClose();
  }, [isConnected, onClose]);

  // EIP-6963 names each installed extension; wagmi's generic injected row is only for a browser
  // where discovery found nothing, and then it is called what it is. Extensions first, then Coinbase.
  const named = connectors.some((c) => c.type === "injected" && c.id !== "injected");
  const listed = [...connectors.filter((c) => c.type === "injected"), ...connectors.filter((c) => c.type !== "injected")].filter(
    (c) => !(c.id === "injected" && named),
  );
  const label = (c: Connector) =>
    c.id === "injected" ? "Browser wallet" : c.id === "coinbaseWalletSDK" && mobile ? "Coinbase Smart Wallet" : c.name;
  const icon = (c: Connector) => c.icon ?? markSrc(c.id) ?? (c.id === "injected" ? BROWSER_MARK : undefined);
  const rejected = error && !isPending;

  return createPortal(
    <div className="sheet-bg" onClick={onClose}>
      <div
        ref={dialogRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h2 id="sheet-title">Connect a wallet</h2>
          <button type="button" className="x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {mobile &&
          OPEN_IN.map((w) => (
            <a key={w.id} className="row" href={w.href(location.href)}>
              <span className="ic">
                <img width={28} height={28} src={markSrc(w.id)} alt="" />
              </span>
              <span>Open in {w.name}</span>
            </a>
          ))}
        {listed
          .filter((c) => !mobile || c.type !== "injected")
          .map((c) => (
            <button
              type="button"
              key={c.uid}
              className="row"
              disabled={isPending}
              onClick={() => {
                reset();
                connect({ connector: c });
              }}
            >
              <span className="ic">{icon(c) && <img width={28} height={28} src={icon(c)} alt="" />}</span>
              <span>
                {label(c)}
                {isPending && variables?.connector === c ? " · opening…" : ""}
              </span>
            </button>
          ))}
        <p className="sheet-note" role="status">
          {rejected ? "The wallet did not connect. Choose a wallet to try again." : ""}
        </p>
      </div>
    </div>,
    document.body,
  );
}

/** A plain browser-window mark for the unnamed injected provider. */
const BROWSER_MARK = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" fill="#2b3659"/><rect x="5.5" y="7.5" width="17" height="13" rx="2" stroke="#fbf1dc" stroke-width="1.5"/><path d="M5.5 11.5h17" stroke="#fbf1dc" stroke-width="1.5"/></svg>',
)}`;
