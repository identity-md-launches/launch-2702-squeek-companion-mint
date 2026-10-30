# Squeek Companion

A static React, TypeScript and Vite mint site for the existing Squeek Companion collection on **Sepolia (11155111)**, at [`0x264730e600808321053729bf3445ffb611c67221`](https://sepolia.etherscan.io/address/0x264730e600808321053729bf3445ffb611c67221).

## Run and rebuild

Use Node.js 24 and npm 11 (the versions used for this revision):

```sh
npm ci
npm run dev
npm run typecheck
npm run build
npm run preview -- --host 127.0.0.1
```

`npm run build` also runs TypeScript. It replaces `dist/`, the complete static export delivered with the source and `package-lock.json`. Serve the contents of `dist/` over HTTP(S); no backend or build step is required on the host. Vite's `base: "./"`, local assets and hash navigation support hosting at a gateway subpath. Do not open `index.html` directly with `file://`.

## Wallets and live data

Connect opens the shared wallet sheet. Browser extensions are discovered with EIP-6963, with a generic browser-wallet fallback and Coinbase Wallet. On a phone without an injected wallet, the sheet opens this page in MetaMask, Coinbase Wallet or Phantom, or offers Coinbase Smart Wallet. Injected Rabby remains supported; there is no mobile Rabby link because the previous link opened its download page instead of the dapp. No relay or project ID is required.

A connected wallet on another chain is prompted to switch to Sepolia. `hasMinted` must finish successfully before minting is enabled; read failures offer **Try again**. A used claim receives a clear explanation. Mint is free, plus Sepolia gas, with one lifetime claim per wallet. The only transaction the site requests is `mint()` on the collection; no approvals or message signatures are requested.

Public reads use the fallbacks in `src/config.ts`: PublicNode, dRPC and 1RPC. `currentState()`, supply and token metadata refresh every 30 seconds. Transfer events enumerate candidate tokens and `ownerOf` verifies ownership. A changed settlement frontier also changes the metadata query key. Metadata stays in memory and is never permanently persisted.

Contract ABI and preview assets originate from the [collection repository](https://github.com/identity-md-launches/launch-2694-squeek-companion). This revision preserves the deployed address, ABI, connectors, RPC configuration and transaction construction.

## Revision validation

The four review findings were reproduced before changes and answered individually in [.imd-responses.json](.imd-responses.json). The mobile facts and header layouts, eligibility failure/retry, and unsupported Rabby link are corrected. The related live-panel breakpoint moved to 34rem after an intermediate-width overflow reproduced at 480px.

Production build and standalone typecheck passed. Chromium and WebKit interaction checks on the actual export passed for loading, error, retry, wrong network, switch, disconnect and a used claim. The pinned `taste@1` probe passed **16/16** checks, including layout at 320, 390 and 1440px. Source and rendered review cover all six Better Interface domains. See [validation evidence and limitations](artifacts/validation.md) and [the implemented design system](DESIGN.md).

Validation used a temporary copy of the source and lockfile to install dependencies and run the package scripts, keeping dependency directories outside this submission. Browser fixtures ran under `test/scratch/`, which the assignment removes; durable evidence is in `artifacts/`.

The build emits existing advisory warnings about a browser-externalized `node:worker_threads` import in a dependency and a JS chunk above 500kB. They do not fail the build; controlled interaction runs have no script errors or missing local resources. Live reads passed in Chromium and direct RPC checks; the temporary WebKit runtime reported "TLS support is not available," so live reads there remain unverified. WebKit's wallet/RPC fixture tests passed. A funded-wallet Sepolia mint, native wallet handoffs/passkeys, physical-device behavior, screen-reader use and native browser zoom were not verified. The public URL is assigned by IMD after it publishes the supplied `dist/`; this revision does not claim a URL or a deployment.
