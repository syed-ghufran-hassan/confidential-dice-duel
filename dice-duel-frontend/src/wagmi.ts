import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { web } from "@zama-fhe/sdk/web";
import { createConfig as createZamaConfig } from "@zama-fhe/react-sdk/wagmi";
import { sepolia as sepoliaFhe, type FheChain } from "@zama-fhe/sdk/chains";

const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";

const isLocal = typeof window !== "undefined" && 
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const RELAYER_URL = isLocal 
  ? `${window.location.origin}/zama-relayer` 
  : "https://relayer.testnet.zama.org";

export const mySepolia = {
  ...sepoliaFhe,
  relayerUrl: RELAYER_URL,
} as const satisfies FheChain;

export const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(RPC_URL),
  },
});

export const zamaConfig = createZamaConfig({
  chains: [mySepolia],
  wagmiConfig,
  relayers: {
    [mySepolia.id]: web(), // 👈 Fixed: Removed the invalid 'transport' option
  },
});