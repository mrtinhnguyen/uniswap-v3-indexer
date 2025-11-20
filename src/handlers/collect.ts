import {UniswapV3Pool} from 'generated';
import {loadTransaction} from '~/utils';
import * as intervalUpdates from '~/utils/intervalUpdates';

UniswapV3Pool.Collect.handler(async ({event, context}) => {
  const poolId = `${event.chainId}-${event.srcAddress.toLowerCase()}`;
  const poolRO = await context.Pool.get(poolId);
  if (!poolRO) return;

  const positionId = `${poolId}#${event.params.owner.toLowerCase()}#${event.params.tickLower}#${event.params.tickUpper}`;

  const [token0RO, token1RO, positionRO] = await Promise.all([
    context.Token.get(poolRO.token0_id),
    context.Token.get(poolRO.token1_id),
    context.Position.get(positionId),
  ]);
  if (!token0RO || !token1RO) return;

  // Create mutable copies of the entities
  const pool = {...poolRO};
  const token0 = {...token0RO};
  const token1 = {...token1RO};
  const timestamp = event.block.timestamp;

  const transaction = await loadTransaction(
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
  pool.tvl0 = pool.tvl0 - collectedAmount0;
  pool.tvl1 = pool.tvl1 - collectedAmount1;

  // Update aggregate fee collection values.
  pool.collectedfees0 = pool.collectedfees0 - collectedAmount0;
  pool.collectedfees1 = pool.collectedfees1 - collectedAmount1;

  const collect = {
    id: `${transaction.id}-${event.logIndex}`,
    transaction_id: transaction.id,
    timestamp: BigInt(timestamp),
    pool_id: pool.id,
    owner: event.params.owner.toLowerCase(),
    amount0: collectedAmount0,
    amount1: collectedAmount1,
    tickLower: event.params.tickLower,
    tickUpper: event.params.tickUpper,
    logIndex: BigInt(event.logIndex),
  };

  // update position collected fees and tokens owed
  if (positionRO) {
    const position = {...positionRO};
    position.collectedFees0 = position.collectedFees0 + collectedAmount0;
    position.collectedFees1 = position.collectedFees1 + collectedAmount1;

    // Deduct collected amounts from tokens owed
    position.tokensOwed0 = position.tokensOwed0 - collectedAmount0;
    position.tokensOwed1 = position.tokensOwed1 - collectedAmount1;

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
  context.Collect.set(collect);
});
