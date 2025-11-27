import {UniswapV3Pool, Burn} from 'generated';
import {
  getOrCreateTransaction,
  getFeeGrowthInside,
  calculateAccruedFees,
  getOrCreateLiquidityProvider,
} from '../utils';
import * as intervalUpdates from '../utils/intervalUpdates';

UniswapV3Pool.Burn.handler(async ({event, context}) => {
  const poolId = `${event.chainId}-${event.srcAddress.toLowerCase()}`;

  const lowerTickId = `${poolId}#${event.params.tickLower}`;
  const upperTickId = `${poolId}#${event.params.tickUpper}`;
  const positionId = `${poolId}#${event.params.owner.toLowerCase()}#${event.params.tickLower}#${event.params.tickUpper}`;

  const poolRO = await context.Pool.get(poolId);
  if (!poolRO) return;

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
  const pool = {...poolRO};
  const token0 = {...token0RO};
  const token1 = {...token1RO};
  const liquidityProvider = {...liquidityProviderRO};
  const timestamp = event.block.timestamp;

  const amount0 = event.params.amount0;
  const amount1 = event.params.amount1;

  token0.txCount = token0.txCount + 1n;
  token0.burnCount = token0.burnCount + 1n;
  token1.txCount = token1.txCount + 1n;
  token1.burnCount = token1.burnCount + 1n;
  pool.txCount = pool.txCount + 1n;
  pool.burnCount = pool.burnCount + 1n;

  // Pools liquidity tracks the currently active liquidity given pools current tick.
  // We only want to update it on burn if the position being burnt includes the current tick.
  if (
    event.params.tickLower <= pool.currentTick &&
    event.params.tickUpper > pool.currentTick
  ) {
    pool.liquidity = pool.liquidity - event.params.amount;
  }

  const transaction = await getOrCreateTransaction(
    event.transaction.hash,
    event.block.number,
    timestamp,
    event.transaction.gasPrice || 0n,
    context,
  );

  const burn: Burn = {
    id: `${transaction.id}-${event.logIndex}`,
    transaction_id: transaction.id,
    timestamp: transaction.timestamp,
    pool_id: pool.id,
    token0_id: pool.token0_id,
    token1_id: pool.token1_id,
    owner: event.params.owner,
    origin: event.transaction.from?.toLowerCase() || '',
    amount: event.params.amount,
    amount0: amount0,
    amount1: amount1,
    tickLower: BigInt(event.params.tickLower),
    tickUpper: BigInt(event.params.tickUpper),
    logIndex: event.logIndex,
  };

  if (lowerTickRO && upperTickRO) {
    const amount = event.params.amount;
    const lowerTick = {...lowerTickRO};
    const upperTick = {...upperTickRO};

    lowerTick.liquidityGross = lowerTick.liquidityGross - amount;
    lowerTick.liquidityNet = lowerTick.liquidityNet - amount;
    upperTick.liquidityGross = upperTick.liquidityGross - amount;
    upperTick.liquidityNet = upperTick.liquidityNet - amount;

    context.Tick.set(lowerTick);
    context.Tick.set(upperTick);
  }

  // update position entity
  if (positionRO && lowerTickRO && upperTickRO) {
    const position = {...positionRO};

    // Calculate fee growth inside position range
    const feeGrowthInside0X128 = getFeeGrowthInside(
      pool.feeGrowthGlobal0X128,
      lowerTickRO.feeGrowthOutside0X128,
      upperTickRO.feeGrowthOutside0X128,
      event.params.tickLower,
      event.params.tickUpper,
      pool.currentTick,
    );

    const feeGrowthInside1X128 = getFeeGrowthInside(
      pool.feeGrowthGlobal1X128,
      lowerTickRO.feeGrowthOutside1X128,
      upperTickRO.feeGrowthOutside1X128,
      event.params.tickLower,
      event.params.tickUpper,
      pool.currentTick,
    );

    // Calculate accrued fees before burning
    if (positionRO.liquidity > 0n) {
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

    position.liquidity = position.liquidity - event.params.amount;
    position.withdrawn0 = position.withdrawn0 + amount0;
    position.withdrawn1 = position.withdrawn1 + amount1;

    // Add withdrawn tokens to tokensOwed (tokens left after burn but before collect)
    position.tokensOwed0 = position.tokensOwed0 + amount0;
    position.tokensOwed1 = position.tokensOwed1 + amount1;

    // Add withdrawn tokens to LP tokensOwed
    liquidityProvider.tokensOwed0 = liquidityProvider.tokensOwed0 + amount0;
    liquidityProvider.tokensOwed1 = liquidityProvider.tokensOwed1 + amount1;
    position.feeGrowthInside0LastX128 = feeGrowthInside0X128;
    position.feeGrowthInside1LastX128 = feeGrowthInside1X128;
    position.burnCount = position.burnCount + 1n;

    // Update active position count if position becomes inactive
    if (position.liquidity === 0n && positionRO.liquidity > 0n) {
      pool.activePositionCount = pool.activePositionCount - 1n;
    }

    // Update LiquidityProvider stats
    liquidityProvider.burnCount = liquidityProvider.burnCount + 1n;

    context.Position.set(position);
    context.LiquidityProvider.set(liquidityProvider);
  }

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

  // Update burn counts for interval data
  poolDayData.burnCount = poolDayData.burnCount + 1n;
  poolHourData.burnCount = poolHourData.burnCount + 1n;
  pool5MinuteData.burnCount = pool5MinuteData.burnCount + 1n;
  token0DayData.burnCount = token0DayData.burnCount + 1n;
  token1DayData.burnCount = token1DayData.burnCount + 1n;
  token0HourData.burnCount = token0HourData.burnCount + 1n;
  token1HourData.burnCount = token1HourData.burnCount + 1n;
  token05MinuteData.burnCount = token05MinuteData.burnCount + 1n;
  token15MinuteData.burnCount = token15MinuteData.burnCount + 1n;

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
  context.Burn.set(burn);
});
