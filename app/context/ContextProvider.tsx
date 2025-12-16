"use client";

import React, { type ReactNode, useMemo } from "react";
import { WalletProvider } from "@tronweb3/tronwallet-adapter-react-hooks";
import { WalletModalProvider } from "@tronweb3/tronwallet-adapter-react-ui";
import { TronLinkAdapter } from "@tronweb3/tronwallet-adapter-tronlink";
import { TrustAdapter } from "@tronweb3/tronwallet-adapter-trust";
import "@tronweb3/tronwallet-adapter-react-ui/style.css";

function ContextProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  // TronLink and TrustWallet adapter setup
  const adapters = useMemo(() => {
    const tronLink = new TronLinkAdapter();
    const trustWallet = new TrustAdapter({
      checkTimeout: 3000, // Wait longer for injection
      openUrlWhenWalletNotFound: true,
    });

    return [tronLink, trustWallet];
  }, []);

  return (
    <WalletProvider adapters={adapters} disableAutoConnectOnLoad={true}>
      <WalletModalProvider>{children}</WalletModalProvider>
    </WalletProvider>
  );
}

export default ContextProvider;
