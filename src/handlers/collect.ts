import {UniswapV3Pool} from 'generated';
import {getOrCreateTransaction, getOrCreateLiquidityProvider} from '../utils';
import * as intervalUpdates from '../utils/intervalUpdates';

UniswapV3Pool.Collect.handler(async ({event, context}) => {
  const poolId = `${event.chainId}-${event.srcAddress.toLowerCase()}`;
  const poolRO = await context.Pool.get(poolId);
  if (!poolRO) return;

  const positionId = `${poolId}#${event.params.owner.toLowerCase()}#${event.params.tickLower}#${event.params.tickUpper}`;

  const [token0RO, token1RO, positionRO, liquidityProviderRO] =
    await Promise.all([
      context.Token.get(poolRO.token0_id),
      context.Token.get(poolRO.token1_id),
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

  const transaction = await getOrCreateTransaction(
    event.transaction.hash,
    event.block.number,
    timestamp,
    event.transaction.gasPrice || 0n,
    context,
  );
  const collectedAmount0 = event.params.amount0;
  const collectedAmount1 = event.params.amount1;

  // update token data
  token0.txCount = token0.txCount + 1n;
  token0.tvl = token0.tvl - collectedAmount0;

  token1.txCount = token1.txCount + 1n;
  token1.tvl = token1.tvl - collectedAmount1;

  // Adjust pool TVL based on amount collected.
  pool.txCount = pool.txCount + 1n;
  pool.collectCount = pool.collectCount + 1n;
  pool.tvl0 = pool.tvl0 - collectedAmount0;
  pool.tvl1 = pool.tvl1 - collectedAmount1;

  // Update aggregate fee collection values.
  pool.collected0 = pool.collected0 + collectedAmount0;
  pool.collected1 = pool.collected1 + collectedAmount1;

  const collect = {
    id: `${transaction.id}-${event.logIndex}`,
    transaction_id: transaction.id,
    timestamp: timestamp,
    pool_id: pool.id,
    owner: event.params.owner.toLowerCase(),
    amount0: collectedAmount0,
    amount1: collectedAmount1,
    tickLower: event.params.tickLower,
    tickUpper: event.params.tickUpper,
    logIndex: event.logIndex,
  };

  // update position collected fees and tokens owed
  if (positionRO) {
    const position = {...positionRO};
    position.collected0 = position.collected0 + collectedAmount0;
    position.collected1 = position.collected1 + collectedAmount1;
    position.collectCount = position.collectCount + 1n;

    // Deduct collected amounts from tokens owed
    position.tokensOwed0 = position.tokensOwed0 - collectedAmount0;
    position.tokensOwed1 = position.tokensOwed1 - collectedAmount1;

    context.Position.set(position);
  }

  // Update LiquidityProvider stats
  liquidityProvider.collected0 =
    liquidityProvider.collected0 + collectedAmount0;
  liquidityProvider.collected1 =
    liquidityProvider.collected1 + collectedAmount1;
  liquidityProvider.collectCount = liquidityProvider.collectCount + 1n;

  // Deduct collected amounts from LP tokens owed
  liquidityProvider.tokensOwed0 =
    liquidityProvider.tokensOwed0 - collectedAmount0;
  liquidityProvider.tokensOwed1 =
    liquidityProvider.tokensOwed1 - collectedAmount1;

  context.LiquidityProvider.set(liquidityProvider);

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

  // Update collect counts for interval data
  poolDayData.collectCount = poolDayData.collectCount + 1n;
  poolHourData.collectCount = poolHourData.collectCount + 1n;
  token0DayData.collectCount = token0DayData.collectCount + 1n;
  token1DayData.collectCount = token1DayData.collectCount + 1n;
  token0HourData.collectCount = token0HourData.collectCount + 1n;
  token1HourData.collectCount = token1HourData.collectCount + 1n;

  context.PoolDayData.set(poolDayData);
  context.PoolHourData.set(poolHourData);
  context.TokenDayData.set(token0DayData);
  context.TokenDayData.set(token1DayData);
  context.TokenHourData.set(token0HourData);
  context.TokenHourData.set(token1HourData);

  context.Token.set(token0);
  context.Token.set(token1);
  context.Pool.set(pool);
  context.Collect.set(collect);
});
