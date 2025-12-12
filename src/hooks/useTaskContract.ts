// hooks/useTaskContract.ts
import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { parseAbi, createPublicClient, createWalletClient, custom, http } from 'viem';

const CONTRACT_ADDRESS = '0x8B6166750571605cd63AE4E4D97750Ac794d034d' as `0x${string}`;

const soneiumMinato = {
  id: 1946,
  name: 'Soneium Minato Testnet',
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
} as const;

const taskTrackerAbi = parseAbi([
  'function createTask(string calldata description) external',
  'function completeTask(uint256 taskId) external',
  'function getUserTasks(address user) external view returns ((string description, bool completed, uint256 timestamp)[])',
  'function getCompletedCount(address user) external view returns (uint256)',
  'event TaskCreated(address indexed user, uint256 taskId, string description)',
  'event TaskCompleted(address indexed user, uint256 taskId)',
]);

export type Task = {
  description: string;
  completed: boolean;
  timestamp: bigint;
};

export function useTaskContract(userAddress: `0x${string}` | undefined) {
  const { wallets } = useWallets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | undefined>();

  const wallet = wallets[0];

  const publicClient = createPublicClient({
    chain: soneiumMinato,
    transport: http(),
  });

  const ensureCorrectChain = async () => {
    if (!wallet) {
      throw new Error('No wallet connected');
    }

    const provider = await wallet.getEthereumProvider();

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${soneiumMinato.id.toString(16)}` }],
      });
    } catch (switchError: any) {
      // If chain doesn't exist in wallet, add it
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${soneiumMinato.id.toString(16)}`,
                chainName: soneiumMinato.name,
                nativeCurrency: soneiumMinato.nativeCurrency,
                rpcUrls: [soneiumMinato.rpcUrls.default.http[0]],
                blockExplorerUrls: [soneiumMinato.blockExplorers.default.url],
              },
            ],
          });
        } catch (addError) {
          throw new Error('Failed to add Soneium Minato network to wallet');
        }
      } else {
        throw switchError;
      }
    }
  };

  const fetchTasks = async () => {
    if (!userAddress) return;

    try {
      const tasksData = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: taskTrackerAbi,
        functionName: 'getUserTasks',
        args: [userAddress],
      });

      const countData = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: taskTrackerAbi,
        functionName: 'getCompletedCount',
        args: [userAddress],
      });

      setTasks(tasksData as Task[]);
      setCompletedCount(Number(countData));
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [userAddress]);

  const createTask = async (description: string) => {
    if (!description.trim()) {
      console.error('Task description cannot be empty');
      return;
    }

    if (!wallet) {
      console.error('No wallet connected');
      return;
    }

    try {
      setIsPending(true);
      setError(null);
      setIsSuccess(false);

      // Ensure wallet is on the correct chain
      await ensureCorrectChain();

      const provider = await wallet.getEthereumProvider();

      const walletClient = createWalletClient({
        chain: soneiumMinato,
        transport: custom(provider),
      });

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: taskTrackerAbi,
        functionName: 'createTask',
        args: [description],
        account: wallet.address as `0x${string}`,
      });

      setTransactionHash(hash);
      setIsPending(false);
      setIsConfirming(true);

      await publicClient.waitForTransactionReceipt({ hash });

      setIsConfirming(false);
      setIsSuccess(true);

      await fetchTasks();

      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err) {
      setIsPending(false);
      setIsConfirming(false);
      setError(err as Error);
      console.error('Error creating task:', err);
    }
  };

  const completeTask = async (taskId: number) => {
    if (!wallet) {
      console.error('No wallet connected');
      return;
    }

    try {
      setIsPending(true);
      setError(null);
      setIsSuccess(false);

      // Ensure wallet is on the correct chain
      await ensureCorrectChain();

      const provider = await wallet.getEthereumProvider();

      const walletClient = createWalletClient({
        chain: soneiumMinato,
        transport: custom(provider),
      });

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: taskTrackerAbi,
        functionName: 'completeTask',
        args: [BigInt(taskId)],
        account: wallet.address as `0x${string}`,
      });

      setTransactionHash(hash);
      setIsPending(false);
      setIsConfirming(true);

      await publicClient.waitForTransactionReceipt({ hash });

      setIsConfirming(false);
      setIsSuccess(true);

      await fetchTasks();

      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err) {
      setIsPending(false);
      setIsConfirming(false);
      setError(err as Error);
      console.error('Error completing task:', err);
    }
  };

  return {
    tasks,
    completedCount,
    createTask,
    completeTask,
    isPending,
    isConfirming,
    isSuccess,
    error,
    refetchTasks: fetchTasks,
    transactionHash,
  };
}