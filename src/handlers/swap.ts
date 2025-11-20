import {handlerContext, UniswapV3Pool, Swap} from 'generated';
import {
  loadTransaction,
  abs,
  calculateFees,
  updateFeeGrowth,
  flipFeeGrowthOutside,
  getTicksCrossed,
} from '~/utils';
import * as intervalUpdates from '~/utils/intervalUpdates';

// Helper function to update tick fee growth when tick is crossed
const updateTickCrossed = async (
  tickId: string,
  feeGrowthGlobal0X128: bigint,
  feeGrowthGlobal1X128: bigint,
  context: handlerContext,
) => {
  const tickRO = await context.Tick.get(tickId);

  if (tickRO) {
    const tick = {...tickRO};
    // When a tick is crossed, we flip the fee growth outside
    tick.feeGrowthOutside0X128 = flipFeeGrowthOutside(
      feeGrowthGlobal0X128,
      tick.feeGrowthOutside0X128,
    );
    tick.feeGrowthOutside1X128 = flipFeeGrowthOutside(
      feeGrowthGlobal1X128,
      tick.feeGrowthOutside1X128,
    );
    context.Tick.set(tick);
  }
};

UniswapV3Pool.Swap.handler(async ({event, context}) => {
  const poolId = `${event.chainId}-${event.srcAddress.toLowerCase()}`;
  const poolRO = await context.Pool.get(poolId);
  if (!poolRO) return;

  const [token0RO, token1RO] = await Promise.all([
    context.Token.get(poolRO.token0_id),
    context.Token.get(poolRO.token1_id),
  ]);

  if (!token0RO || !token1RO) return;

  // Create mutable copies of the entities
  const token0 = {...token0RO};
  const token1 = {...token1RO};
  const pool = {...poolRO};
  const timestamp = event.block.timestamp;

  // amounts - 0/1 are token deltas: can be positive or negative
  const amount0 = event.params.amount0;
  const amount1 = event.params.amount1;

  // need absolute amounts for volume
  const amount0Abs = abs(amount0);
  const amount1Abs = abs(amount1);

  const fees0 = calculateFees(amount0Abs, pool.feeTier);
  const fees1 = calculateFees(amount1Abs, pool.feeTier);

  // Update global fee growth using liquidity BEFORE the swap
  pool.feeGrowthGlobal0X128 = updateFeeGrowth(
    pool.feeGrowthGlobal0X128,
    fees0,
    poolRO.liquidity,
  );
  pool.feeGrowthGlobal1X128 = updateFeeGrowth(
    pool.feeGrowthGlobal1X128,
    fees1,
    poolRO.liquidity,
  );

  // Handle tick crossing - update fee growth outside for crossed ticks
  const oldTick = poolRO.currentTick;
  const newTick = event.params.tick;

  // If ticks changed, we need to update all crossed ticks
  if (oldTick !== newTick) {
    const ticksCrossed = getTicksCrossed(oldTick, newTick);

    // Update each crossed tick's fee growth outside
    // OPTIMIZATION NOTE: This implementation attempts to update EVERY tick in the crossed range.
    // In production, you should ONLY update INITIALIZED ticks (ticks with liquidity).
    // Consider maintaining a separate index of initialized ticks or querying only existing
    // ticks from the database to avoid unnecessary operations on uninitialized ticks.
    // For large price movements, this could be very expensive.
    await Promise.all(
      ticksCrossed.map(tickIdx =>
        updateTickCrossed(
          `${poolId}#${tickIdx}`,
          pool.feeGrowthGlobal0X128,
          pool.feeGrowthGlobal1X128,
          context,
        ),
      ),
    );
  }

  // pool volume
  pool.volume0 = pool.volume0 + amount0Abs;
  pool.volume1 = pool.volume1 + amount1Abs;
  pool.fees0 = pool.fees0 + fees0;
  pool.fees1 = pool.fees1 + fees1;
  pool.txCount = pool.txCount + 1n;

  // Update the pool with the new active liquidity, price, and tick.
  pool.liquidity = event.params.liquidity;
  pool.currentTick = event.params.tick;
  pool.sqrtPriceX96 = event.params.sqrtPriceX96;
  pool.tvl0 = pool.tvl0 + event.params.amount0;
  pool.tvl1 = pool.tvl1 + event.params.amount1;

  // update token0 data
  token0.volume = token0.volume + amount0Abs;
  token0.tvl = token0.tvl + amount0;
  token0.txCount = token0.txCount + 1n;

  // update token1 data
  token1.volume = token1.volume + amount1Abs;
  token1.tvl = token1.tvl + amount1;
  token1.txCount = token1.txCount + 1n;

  context.Pool.set(pool);

  // create Swap event
  const transaction = await loadTransaction(
    event.transaction.hash,
    event.block.number,
    timestamp,
    event.transaction.gasPrice || 0n,
    context,
  );

  const swap: Swap = {
    id: `${transaction.id.toLowerCase()}-${event.logIndex}`,
    transaction_id: transaction.id,
    timestamp: transaction.timestamp,
    pool_id: pool.id,
    token0_id: pool.token0_id,
    token1_id: pool.token1_id,
    sender: event.params.sender,
    origin: event.transaction.from?.toLowerCase() || '',
    recipient: event.params.recipient,
    amount0: amount0,
    amount1: amount1,
    tick: event.params.tick,
    sqrtPriceX96: event.params.sqrtPriceX96,
    logIndex: BigInt(event.logIndex),
  };

  // interval data
  const [
    poolDayData,
    poolHourData,
    token0DayData,
    token1DayData,
    token0HourData,
    token1HourData,
  ] = await Promise.all([
    intervalUpdates.updatePoolDayData(timestamp, pool, context),
    intervalUpdates.updatePoolHourData(timestamp, pool, context),
    intervalUpdates.updateTokenDayData(timestamp, token0, context),
    intervalUpdates.updateTokenDayData(timestamp, token1, context),
    intervalUpdates.updateTokenHourData(timestamp, token0, context),
    intervalUpdates.updateTokenHourData(timestamp, token1, context),
  ]);

  // update volume metrics
  poolDayData.volume0 = poolDayData.volume0 + amount0Abs;
  poolDayData.volume1 = poolDayData.volume1 + amount1Abs;
  poolDayData.fees0 = poolDayData.fees0 + fees0;
  poolDayData.fees1 = poolDayData.fees1 + fees1;

  poolHourData.volume0 = poolHourData.volume0 + amount0Abs;
  poolHourData.volume1 = poolHourData.volume1 + amount1Abs;
  poolHourData.fees0 = poolHourData.fees0 + fees0;
  poolHourData.fees1 = poolHourData.fees1 + fees1;

  token0DayData.volume = token0DayData.volume + amount0Abs;
  token0HourData.volume = token0HourData.volume + amount0Abs;

  token1DayData.volume = token1DayData.volume + amount1Abs;
  token1HourData.volume = token1HourData.volume + amount1Abs;

  context.Swap.set(swap);
  context.TokenDayData.set(token0DayData);
  context.TokenDayData.set(token1DayData);
  context.PoolDayData.set(poolDayData);
  context.PoolHourData.set(poolHourData);
  context.TokenHourData.set(token0HourData);
  context.TokenHourData.set(token1HourData);
  context.Pool.set(pool);
  context.Token.set(token0);
  context.Token.set(token1);
});
