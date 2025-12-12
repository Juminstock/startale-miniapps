import {PrivyProvider} from '@privy-io/react-auth';

const soneiumMinato = {
  id: 1946,
  name: 'Soneium Minato Testnet',
  network: 'soneium-minato',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.minato.soneium.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Soneium Minato Explorer',
      url: 'https://soneium-minato.blockscout.com/',
    },
  },
  testnet: true,
};

export default function Providers({children}: {children: React.ReactNode}) {
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || ''}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#000000',
          logo: '/images/icon.png',
          landingHeader: 'Welcome to Task Tracker!',
          loginMessage: 'Create your account or login to continue',
          walletList: ['metamask','zerion', 'coinbase_wallet', 'rainbow', 'wallet_connect'],
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets'
          }
        },
        supportedChains: [soneiumMinato],
        defaultChain: soneiumMinato,
      }}
    >
      {children}
    </PrivyProvider>
  );
}