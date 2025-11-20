import {UniswapV3Pool, Burn} from 'generated';
import {
  loadTransaction,
  getFeeGrowthInside,
  calculateTokensOwed,
} from '~/utils';
import * as intervalUpdates from '~/utils/intervalUpdates';

UniswapV3Pool.Burn.handler(async ({event, context}) => {
  const poolId = `${event.chainId}-${event.srcAddress.toLowerCase()}`;

  const lowerTickId = `${poolId}#${event.params.tickLower}`;
  const upperTickId = `${poolId}#${event.params.tickUpper}`;
  const positionId = `${poolId}#${event.params.owner.toLowerCase()}#${event.params.tickLower}#${event.params.tickUpper}`;

  const poolRO = await context.Pool.get(poolId);
  if (!poolRO) return;

  const [token0RO, token1RO, lowerTickRO, upperTickRO, positionRO] =
    await Promise.all([
      context.Token.get(poolRO.token0_id),
      context.Token.get(poolRO.token1_id),
      context.Tick.get(lowerTickId),
      context.Tick.get(upperTickId),
      context.Position.get(positionId),
    ]);

  if (!token0RO || !token1RO) return;

  // Create mutable copies of the entities
  const pool = {...poolRO};
  const token0 = {...token0RO};
  const token1 = {...token1RO};
  const timestamp = event.block.timestamp;

  const amount0 = event.params.amount0;
  const amount1 = event.params.amount1;

  token0.txCount = token0.txCount + 1n;
  token1.txCount = token1.txCount + 1n;
  pool.txCount = pool.txCount + 1n;

  // Pools liquidity tracks the currently active liquidity given pools current tick.
  // We only want to update it on burn if the position being burnt includes the current tick.
  if (
    event.params.tickLower <= pool.currentTick &&
    event.params.tickUpper > pool.currentTick
  ) {
    pool.liquidity = pool.liquidity - event.params.amount;
  }

  const transaction = await loadTransaction(
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
    logIndex: BigInt(event.logIndex),
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

    // Calculate tokens owed (uncollected fees) before burning
    if (positionRO.liquidity > 0n) {
      const tokensOwed0 = calculateTokensOwed(
        positionRO.liquidity,
        feeGrowthInside0X128,
        positionRO.feeGrowthInside0LastX128,
      );
      const tokensOwed1 = calculateTokensOwed(
        positionRO.liquidity,
        feeGrowthInside1X128,
        positionRO.feeGrowthInside1LastX128,
      );

      position.tokensOwed0 = position.tokensOwed0 + tokensOwed0;
      position.tokensOwed1 = position.tokensOwed1 + tokensOwed1;
    }

    position.liquidity = position.liquidity - event.params.amount;
    position.withdrawn0 = position.withdrawn0 + amount0;
    position.withdrawn1 = position.withdrawn1 + amount1;
    position.feeGrowthInside0LastX128 = feeGrowthInside0X128;
    position.feeGrowthInside1LastX128 = feeGrowthInside1X128;
    context.Position.set(position);
  }

  await Promise.all([
    intervalUpdates.updatePoolDayData(timestamp, pool, context),
    intervalUpdates.updatePoolHourData(timestamp, pool, context),
    intervalUpdates.updateTokenDayData(timestamp, token0, context),
    intervalUpdates.updateTokenDayData(timestamp, token1, context),
    intervalUpdates.updateTokenHourData(timestamp, token0, context),
    intervalUpdates.updateTokenHourData(timestamp, token1, context),
  ]);
  context.Token.set(token0);
  context.Token.set(token1);
  context.Pool.set(pool);
  context.Burn.set(burn);
});
