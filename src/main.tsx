import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { App } from "./App";
import { ConnectSheetProvider } from "./ConnectSheet";
import { config } from "./config";
import "./styles.css";

// In-memory only: token metadata is never persisted, so the art always reflects a fresh read.
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, retry: 2 } } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectSheetProvider>
          <App />
        </ConnectSheetProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
