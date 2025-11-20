import {handlerContext, UniswapV3Pool} from 'generated';
import {updatePoolDayData, updatePoolHourData} from '../utils/intervalUpdates';
import {getPoolDataEffect} from '../effects/getPoolData';
import {getTokenMetadataEffect} from '../effects/getTokenMetadata';

export const getOrCreateToken = async (
  tokenId: string,
  tokenAddress: string,
  chainId: number,
  context: handlerContext,
) => {
  let token = await context.Token.get(tokenId);

  if (!token) {
    const metadata = await context.effect(getTokenMetadataEffect, {
      address: tokenAddress,
      chainId: chainId,
    });
    token = {
      id: tokenId,
      symbol: metadata.symbol,
      name: metadata.name,
      decimals: BigInt(metadata.decimals),
      volume: 0n,
      txCount: 0n,
      poolCount: 0n,
      swapCount: 0n,
      mintCount: 0n,
      burnCount: 0n,
      positionCount: 0n,
      lpCount: 0n,
      tvl: 0n,
    };
    context.Token.set(token);
    console.log(`Created token: ${token.symbol} (${tokenId})`);
  }
  return token;
};

UniswapV3Pool.Initialize.handler(async ({event, context}) => {
  const poolId = `${event.chainId}-${event.srcAddress.toLowerCase()}`;

  console.log(`Creating new pool: ${poolId}`);

  const poolData = await context.effect(getPoolDataEffect, {
    poolAddress: event.srcAddress,
    chainId: event.chainId,
  });
  const token0Id = `${event.chainId}-${poolData.token0.toLowerCase()}`;
  const token1Id = `${event.chainId}-${poolData.token1.toLowerCase()}`;

  // Get or create tokens
  const token0 = await getOrCreateToken(
    token0Id,
    poolData.token0,
    event.chainId,
    context,
  );
  const token1 = await getOrCreateToken(
    token1Id,
    poolData.token1,
    event.chainId,
    context,
  );

  // Update token pool counts
  const updatedToken0 = {...token0, poolCount: token0.poolCount + 1n};
  const updatedToken1 = {...token1, poolCount: token1.poolCount + 1n};
  context.Token.set(updatedToken0);
  context.Token.set(updatedToken1);

  // Create the pool entity
  const pool = {
    id: poolId,
    createdAtTimestamp: event.block.timestamp,
    createdAtBlockNumber: event.block.number,
    token0_id: token0Id,
    token1_id: token1Id,
    feeTier: BigInt(poolData.fee),
    liquidity: 0n,
    sqrtPriceX96: event.params.sqrtPriceX96,
    currentTick: event.params.tick,
    observationIndex: 0n,
    feeGrowthGlobal0X128: 0n,
    feeGrowthGlobal1X128: 0n,
    volume0: 0n,
    volume1: 0n,
    fees0: 0n,
    fees1: 0n,
    collected0: 0n,
    collected1: 0n,
    txCount: 0n,
    swapCount: 0n,
    mintCount: 0n,
    burnCount: 0n,
    collectCount: 0n,
    positionCount: 0n,
    activePositionCount: 0n,
    lpCount: 0n,
    tvl0: 0n,
    tvl1: 0n,
  };

  context.Pool.set(pool);
  console.log(
    `Created pool: ${token0.symbol}/${token1.symbol} (${poolId}) with fee tier ${poolData.fee}`,
  );

  await updatePoolDayData(event.block.timestamp, pool, context);
  await updatePoolHourData(event.block.timestamp, pool, context);

  console.log(
    `Initialized pool: ${token0.symbol}/${token1.symbol} at sqrtPrice ${pool.sqrtPriceX96} (tick ${pool.currentTick})`,
  );
});
