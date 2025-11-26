import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";

const ethereumSepolia = {
  id: 11155111,
  name: 'Ethereum Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://ethereum-sepolia-rpc.publicnode.com'] },
  },
  blockExplorers: {
    default: { name: 'Ethereum Sepolia Explorer', url: 'https://sepolia.etherscan.io/' },
  },
  testnet: true,
} as const;

export const config = createConfig({
  chains: [ethereumSepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [ethereumSepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}