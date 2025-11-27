import {UniswapV3Pool} from 'generated';
import {
  getOrCreateTransaction,
  getFeeGrowthInside,
  calculateAccruedFees,
  getOrCreateLiquidityProvider,
} from '../utils';
import * as intervalUpdates from '../utils/intervalUpdates';

UniswapV3Pool.Mint.handler(async ({event, context}) => {
  const poolId = `${event.chainId}-${event.srcAddress.toLowerCase()}`;
  const poolRO = await context.Pool.get(poolId);
  if (!poolRO) return;

  const lowerTickId = `${poolId}#${event.params.tickLower}`;
  const upperTickId = `${poolId}#${event.params.tickUpper}`;
  const positionId = `${poolId}#${event.params.owner.toLowerCase()}#${event.params.tickLower}#${event.params.tickUpper}`;

  const [
    token0RO,
    token1RO,
    lowerTickRO,
    upperTickRO,
    positionRO,
    liquidityProviderRO,
  ] = await Promise.all([
    context.Token.get(poolRO.token0_id),
    context.Token.get(poolRO.token1_id),
    context.Tick.get(lowerTickId),
    context.Tick.get(upperTickId),
    context.Position.get(positionId),
    getOrCreateLiquidityProvider(
      event.chainId,
      event.srcAddress,
      event.params.owner,
      event.block.timestamp,
      event.block.number,
      context,
    ),
  ]);

  if (!token0RO || !token1RO) return;

  // Create mutable copies of the entities
  const token0 = {...token0RO};
  const token1 = {...token1RO};
  const pool = {...poolRO};
  const liquidityProvider = {...liquidityProviderRO};

  const timestamp = event.block.timestamp;

  const amount0 = event.params.amount0;
  const amount1 = event.params.amount1;

  // update token0 data
  token0.txCount = token0.txCount + 1n;
  token0.mintCount = token0.mintCount + 1n;
  token0.tvl = token0.tvl + amount0;

  // update token1 data
  token1.txCount = token1.txCount + 1n;
  token1.mintCount = token1.mintCount + 1n;
  token1.tvl = token1.tvl + amount1;

  // pool data
  pool.txCount = pool.txCount + 1n;
  pool.mintCount = pool.mintCount + 1n;

  // Pools liquidity tracks the currently active liquidity given pools current tick.
  // We only want to update it on mint if the new position includes the current tick.
  if (
    event.params.tickLower <= pool.currentTick &&
    event.params.tickUpper > pool.currentTick
  ) {
    pool.liquidity = pool.liquidity + event.params.amount;
  }

  pool.tvl0 = pool.tvl0 + amount0;
  pool.tvl1 = pool.tvl1 + amount1;

  const transaction = await getOrCreateTransaction(
    event.transaction.hash,
    event.block.number,
    event.block.timestamp,
    event.transaction.gasPrice || 0n,
    context,
  );

  const mint = {
    id: `${transaction.id}-${event.logIndex}`,
    transaction_id: transaction.id,
    timestamp: transaction.timestamp,
    pool_id: pool.id,
    token0_id: pool.token0_id,
    token1_id: pool.token1_id,
    owner: event.params.owner,
    sender: event.params.sender,
    origin: event.transaction.from?.toLowerCase() || '',
    amount: event.params.amount,
    amount0: amount0,
    amount1: amount1,
    tickLower: event.params.tickLower,
    tickUpper: event.params.tickUpper,
    logIndex: event.logIndex,
  };

  // tick entities
  const lowerTickIdx = event.params.tickLower;
  const upperTickIdx = event.params.tickUpper;
  const ltId = `${pool.id}#${lowerTickIdx}`;
  const utId = `${pool.id}#${upperTickIdx}`;
  const amount = event.params.amount;

  const lowerTick = lowerTickRO
    ? {...lowerTickRO}
    : createTick(ltId, lowerTickIdx, pool.id, timestamp, event.block.number);

  const upperTick = upperTickRO
    ? {...upperTickRO}
    : createTick(utId, upperTickIdx, pool.id, timestamp, event.block.number);

  lowerTick.liquidityGross = lowerTick.liquidityGross + amount;
  lowerTick.liquidityNet = lowerTick.liquidityNet + amount;
  upperTick.liquidityGross = upperTick.liquidityGross + amount;
  upperTick.liquidityNet = upperTick.liquidityNet - amount;

  // Increment tick position count if this is a new position
  if (!positionRO) {
    lowerTick.positionCount = lowerTick.positionCount + 1n;
    upperTick.positionCount = upperTick.positionCount + 1n;
  }

  context.Tick.set(lowerTick);
  context.Tick.set(upperTick);

  // Calculate fee growth inside position range
  const feeGrowthInside0X128 = getFeeGrowthInside(
    pool.feeGrowthGlobal0X128,
    lowerTick.feeGrowthOutside0X128,
    upperTick.feeGrowthOutside0X128,
    event.params.tickLower,
    event.params.tickUpper,
    pool.currentTick,
  );

  const feeGrowthInside1X128 = getFeeGrowthInside(
    pool.feeGrowthGlobal1X128,
    lowerTick.feeGrowthOutside1X128,
    upperTick.feeGrowthOutside1X128,
    event.params.tickLower,
    event.params.tickUpper,
    pool.currentTick,
  );

  // position entity
  const position = positionRO
    ? {...positionRO}
    : createPosition(
        positionId,
        event.params.owner,
        pool.id,
        pool.token0_id,
        pool.token1_id,
        event.params.tickLower,
        event.params.tickUpper,
        transaction.id,
        timestamp,
        event.block.number,
        liquidityProvider.id,
      );

  // Calculate accrued fees if position already exists
  if (positionRO && positionRO.liquidity > 0n) {
    const accruedFees0 = calculateAccruedFees(
      positionRO.liquidity,
      feeGrowthInside0X128,
      positionRO.feeGrowthInside0LastX128,
    );
    const accruedFees1 = calculateAccruedFees(
      positionRO.liquidity,
      feeGrowthInside1X128,
      positionRO.feeGrowthInside1LastX128,
    );

    // Add accrued fees to fees tracking
    position.fees0 = position.fees0 + accruedFees0;
    position.fees1 = position.fees1 + accruedFees1;

    // Add accrued fees to tokensOwed
    position.tokensOwed0 = position.tokensOwed0 + accruedFees0;
    position.tokensOwed1 = position.tokensOwed1 + accruedFees1;

    // Update LP fees
    liquidityProvider.fees0 = liquidityProvider.fees0 + accruedFees0;
    liquidityProvider.fees1 = liquidityProvider.fees1 + accruedFees1;

    // Add accrued fees to LP tokensOwed
    liquidityProvider.tokensOwed0 =
      liquidityProvider.tokensOwed0 + accruedFees0;
    liquidityProvider.tokensOwed1 =
      liquidityProvider.tokensOwed1 + accruedFees1;
  }

  position.liquidity = position.liquidity + event.params.amount;
  position.deposited0 = position.deposited0 + amount0;
  position.deposited1 = position.deposited1 + amount1;
  position.feeGrowthInside0LastX128 = feeGrowthInside0X128;
  position.feeGrowthInside1LastX128 = feeGrowthInside1X128;
  position.mintCount = position.mintCount + 1n;

  // Update LiquidityProvider stats
  liquidityProvider.deposited0 = liquidityProvider.deposited0 + amount0;
  liquidityProvider.deposited1 = liquidityProvider.deposited1 + amount1;
  liquidityProvider.mintCount = liquidityProvider.mintCount + 1n;

  // Increment pool and token position counts if this is a new position
  if (!positionRO) {
    liquidityProvider.positionCount = liquidityProvider.positionCount + 1n;
    pool.positionCount = pool.positionCount + 1n;
    token0.positionCount = token0.positionCount + 1n;
    token1.positionCount = token1.positionCount + 1n;
  }

  // Update active position count
  if (position.liquidity > 0n && (!positionRO || positionRO.liquidity === 0n)) {
    pool.activePositionCount = pool.activePositionCount + 1n;
  }

  context.Position.set(position);
  context.LiquidityProvider.set(liquidityProvider);

  const [
    poolDayData,
    poolHourData,
    pool5MinuteData,
    token0DayData,
    token1DayData,
    token0HourData,
    token1HourData,
    token05MinuteData,
    token15MinuteData,
  ] = await Promise.all([
    intervalUpdates.updatePoolDayData(timestamp, pool, context),
    intervalUpdates.updatePoolHourData(timestamp, pool, context),
    intervalUpdates.updatePool5MinuteData(timestamp, pool, context),
    intervalUpdates.updateTokenDayData(timestamp, token0, context),
    intervalUpdates.updateTokenDayData(timestamp, token1, context),
    intervalUpdates.updateTokenHourData(timestamp, token0, context),
    intervalUpdates.updateTokenHourData(timestamp, token1, context),
    intervalUpdates.updateToken5MinuteData(timestamp, token0, context),
    intervalUpdates.updateToken5MinuteData(timestamp, token1, context),
  ]);

  // Update mint counts for interval data
  poolDayData.mintCount = poolDayData.mintCount + 1n;
  poolHourData.mintCount = poolHourData.mintCount + 1n;
  pool5MinuteData.mintCount = pool5MinuteData.mintCount + 1n;
  token0DayData.mintCount = token0DayData.mintCount + 1n;
  token1DayData.mintCount = token1DayData.mintCount + 1n;
  token0HourData.mintCount = token0HourData.mintCount + 1n;
  token1HourData.mintCount = token1HourData.mintCount + 1n;
  token05MinuteData.mintCount = token05MinuteData.mintCount + 1n;
  token15MinuteData.mintCount = token15MinuteData.mintCount + 1n;

  context.PoolDayData.set(poolDayData);
  context.PoolHourData.set(poolHourData);
  context.Pool5MinuteData.set(pool5MinuteData);
  context.TokenDayData.set(token0DayData);
  context.TokenDayData.set(token1DayData);
  context.TokenHourData.set(token0HourData);
  context.TokenHourData.set(token1HourData);
  context.Token5MinuteData.set(token05MinuteData);
  context.Token5MinuteData.set(token15MinuteData);
  context.Token.set(token0);
  context.Token.set(token1);
  context.Pool.set(pool);
  context.Mint.set(mint);
});

const createTick = (
  tickId: string,
  tickIdx: bigint,
  poolId: string,
  timestamp: number,
  blockNumber: number,
) => ({
  id: tickId,
  tickIdx: tickIdx,
  pool_id: poolId,
  poolAddress: poolId,
  createdAtTimestamp: timestamp,
  createdAtBlockNumber: blockNumber,
  liquidityGross: 0n,
  liquidityNet: 0n,
  feeGrowthOutside0X128: 0n,
  feeGrowthOutside1X128: 0n,
  positionCount: 0n,
});

const createPosition = (
  positionId: string,
  owner: string,
  poolId: string,
  token0Id: string,
  token1Id: string,
  tickLower: bigint,
  tickUpper: bigint,
  transactionId: string,
  timestamp: number,
  blockNumber: number,
  liquidityProviderId: string,
) => ({
  id: positionId,
  owner: owner.toLowerCase(),
  liquidityProvider_id: liquidityProviderId,
  pool_id: poolId,
  token0_id: token0Id,
  token1_id: token1Id,
  tickLower: tickLower,
  tickUpper: tickUpper,
  liquidity: 0n,
  deposited0: 0n,
  deposited1: 0n,
  withdrawn0: 0n,
  withdrawn1: 0n,
  collected0: 0n,
  collected1: 0n,
  fees0: 0n,
  fees1: 0n,
  tokensOwed0: 0n,
  tokensOwed1: 0n,
  feeGrowthInside0LastX128: 0n,
  feeGrowthInside1LastX128: 0n,
  mintCount: 0n,
  burnCount: 0n,
  collectCount: 0n,
  transaction_id: transactionId,
  createdAtTimestamp: timestamp,
  createdAtBlockNumber: blockNumber,
});
