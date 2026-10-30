import { createConfig, fallback, http } from "wagmi";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { sepolia } from "viem/chains";

export const SITE_NAME = "Squeek Companion";
export const SITE_DESCRIPTION =
  "Mint a free on-chain pixel hamster on Sepolia. Its art follows Squeekchain's wheel: running, napping or sleeping.";

export const chain = sepolia;

/** The live collection on Sepolia. Do not redeploy; this site only reads it and calls mint(). */
export const COMPANION_ADDRESS = "0x264730e600808321053729bf3445ffb611c67221" as const;
/** First block with code at COMPANION_ADDRESS; Transfer scans start here. */
export const DEPLOY_BLOCK = 12_025_266n;
export const PUBLIC_SUPPLY = 900;
export const MAX_SUPPLY = 999;

export const EXPLORER = "https://sepolia.etherscan.io";
export const SOURCE_REPO = "https://github.com/identity-md-launches/launch-2694-squeek-companion";

/**
 * Public Sepolia RPCs, tried in order. A test build may point reads at a local fork with
 * VITE_RPC_URL; production builds leave it unset.
 */
const override = import.meta.env.VITE_RPC_URL as string | undefined;
export const PUBLIC_RPC_URLS = override
  ? [override]
  : ["https://ethereum-sepolia-rpc.publicnode.com", "https://sepolia.drpc.org", "https://1rpc.io/sepolia"];

/** How often the live state, supply and gallery art are re-read. */
export const REFRESH_MS = 30_000;

export const config = createConfig({
  chains: [chain],
  // EIP-6963 discovery lists every installed extension under its own name
  multiInjectedProviderDiscovery: true,
  connectors: [injected(), coinbaseWallet({ appName: SITE_NAME })],
  transports: { [chain.id]: fallback(PUBLIC_RPC_URLS.map((url) => http(url, { batch: true }))) },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
