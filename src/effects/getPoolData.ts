import {createEffect, S} from 'envio';
import {getContract} from 'viem';
import {uniswapV3PoolAbi} from '../abi/IUniswapV3Pool';
import {getPublicClient} from '../utils/rpc';

export const getPoolDataEffect = createEffect(
  {
    name: 'getPoolData',
    input: {
      poolAddress: S.string,
      chainId: S.number,
    },
    output: {
      token0: S.string,
      token1: S.string,
      fee: S.number,
    },
    cache: true,
    rateLimit: false,
  },
  async ({input}) => {
    const {poolAddress, chainId} = input;
    const client = getPublicClient(chainId);

    const contract = getContract({
      address: poolAddress as `0x${string}`,
      abi: uniswapV3PoolAbi,
      client,
    });
    const [token0, token1, fee] = await Promise.all([
      contract.read.token0({}),
      contract.read.token1({}),
      contract.read.fee({}),
    ]);
    return {token0, token1, fee};
  },
);
