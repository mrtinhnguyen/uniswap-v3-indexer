import type {handlerContext, Pool, Token} from 'generated';

export const updatePoolDayData = async (
  timestamp: number,
  pool: Pool,
  context: handlerContext,
) => {
  const dayId = Math.floor(timestamp / 86400);
  const dayStartTimestamp = dayId * 86400;
  const dayPoolId = `${pool.id}-${dayId}`;
  const poolDayDataRO = await context.PoolDayData.get(dayPoolId);

  const poolDayData = poolDayDataRO
    ? {...poolDayDataRO}
    : {
        id: dayPoolId,
        startTimestamp: dayStartTimestamp,
        pool_id: pool.id,
        volume0: 0n,
        volume1: 0n,
        fees0: 0n,
        fees1: 0n,
        txCount: 0n,
        swapCount: 0n,
        mintCount: 0n,
        burnCount: 0n,
        collectCount: 0n,
        open_: pool.sqrtPriceX96,
        high: pool.sqrtPriceX96,
        low: pool.sqrtPriceX96,
        close: pool.sqrtPriceX96,
        liquidity: pool.liquidity,
        sqrtPriceX96: pool.sqrtPriceX96,
        tick: pool.currentTick,
      };

  if (pool.sqrtPriceX96 > poolDayData.high) {
    poolDayData.high = pool.sqrtPriceX96;
  }
  if (pool.sqrtPriceX96 < poolDayData.low) {
    poolDayData.low = pool.sqrtPriceX96;
  }
  poolDayData.liquidity = pool.liquidity;
  poolDayData.sqrtPriceX96 = pool.sqrtPriceX96;
  poolDayData.close = pool.sqrtPriceX96;
  poolDayData.tick = pool.currentTick;
  poolDayData.txCount = poolDayData.txCount + 1n;

  context.PoolDayData.set(poolDayData);
  return {...poolDayData};
};

export const updatePool5MinuteData = async (
  timestamp: number,
  pool: Pool,
  context: handlerContext,
) => {
  const fiveMinuteIndex = Math.floor(timestamp / 300); // get unique 5-minute period within unix history
  const fiveMinuteStartUnix = fiveMinuteIndex * 300; // want the rounded effect
  const fiveMinutePoolId = `${pool.id}-${fiveMinuteIndex}`;
  const pool5MinuteDataRO = await context.Pool5MinuteData.get(fiveMinutePoolId);

  const pool5MinuteData = pool5MinuteDataRO
    ? {...pool5MinuteDataRO}
    : {
        id: fiveMinutePoolId,
        startTimestamp: fiveMinuteStartUnix,
        pool_id: pool.id,
        volume0: 0n,
        volume1: 0n,
        fees0: 0n,
        fees1: 0n,
        txCount: 0n,
        swapCount: 0n,
        mintCount: 0n,
        burnCount: 0n,
        collectCount: 0n,
        open_: pool.sqrtPriceX96,
        high: pool.sqrtPriceX96,
        low: pool.sqrtPriceX96,
        close: pool.sqrtPriceX96,
        liquidity: 0n,
        sqrtPriceX96: 0n,
        tick: pool.currentTick,
      };

  if (pool.sqrtPriceX96 > pool5MinuteData.high) {
    pool5MinuteData.high = pool.sqrtPriceX96;
  }
  if (pool.sqrtPriceX96 < pool5MinuteData.low) {
    pool5MinuteData.low = pool.sqrtPriceX96;
  }
  pool5MinuteData.liquidity = pool.liquidity;
  pool5MinuteData.sqrtPriceX96 = pool.sqrtPriceX96;
  pool5MinuteData.close = pool.sqrtPriceX96;
  pool5MinuteData.tick = pool.currentTick;
  pool5MinuteData.txCount = pool5MinuteData.txCount + 1n;

  context.Pool5MinuteData.set(pool5MinuteData);
  return {...pool5MinuteData};
};

export const updatePoolHourData = async (
  timestamp: number,
  pool: Pool,
  context: handlerContext,
) => {
  const hourIndex = Math.floor(timestamp / 3600); // get unique hour within unix history
  const hourStartUnix = hourIndex * 3600; // want the rounded effect
  const hourPoolId = `${pool.id}-${hourIndex}`;
  const poolHourDataRO = await context.PoolHourData.get(hourPoolId);

  const poolHourData = poolHourDataRO
    ? {...poolHourDataRO}
    : {
        id: hourPoolId,
        startTimestamp: hourStartUnix,
        pool_id: pool.id,
        volume0: 0n,
        volume1: 0n,
        fees0: 0n,
        fees1: 0n,
        txCount: 0n,
        swapCount: 0n,
        mintCount: 0n,
        burnCount: 0n,
        collectCount: 0n,
        open_: pool.sqrtPriceX96,
        high: pool.sqrtPriceX96,
        low: pool.sqrtPriceX96,
        close: pool.sqrtPriceX96,
        liquidity: 0n,
        sqrtPriceX96: 0n,
        tick: pool.currentTick,
      };

  if (pool.sqrtPriceX96 > poolHourData.high) {
    poolHourData.high = pool.sqrtPriceX96;
  }
  if (pool.sqrtPriceX96 < poolHourData.low) {
    poolHourData.low = pool.sqrtPriceX96;
  }
  poolHourData.liquidity = pool.liquidity;
  poolHourData.sqrtPriceX96 = pool.sqrtPriceX96;
  poolHourData.close = pool.sqrtPriceX96;
  poolHourData.tick = pool.currentTick;
  poolHourData.txCount = poolHourData.txCount + 1n;

  context.PoolHourData.set(poolHourData);
  return {...poolHourData};
};

export const updateTokenDayData = async (
  timestamp: number,
  token: Token,
  context: handlerContext,
) => {
  const dayId = Math.floor(timestamp / 86400);
  const dayStartTimestamp = dayId * 86400;
  const tokenDayId = `${token.id}-${dayId}`;
  const tokenDayDataRO = await context.TokenDayData.get(tokenDayId);

  const tokenDayData = tokenDayDataRO
    ? {...tokenDayDataRO}
    : {
        id: tokenDayId,
        date: dayStartTimestamp,
        token_id: token.id,
        volume: 0n,
        tvl: 0n,
        txCount: 0n,
        swapCount: 0n,
        mintCount: 0n,
        burnCount: 0n,
        collectCount: 0n,
      };

  tokenDayData.tvl = token.tvl;
  tokenDayData.txCount = tokenDayData.txCount + 1n;

  context.TokenDayData.set(tokenDayData);
  return {...tokenDayData};
};

export const updateToken5MinuteData = async (
  timestamp: number,
  token: Token,
  context: handlerContext,
) => {
  const fiveMinuteIndex = Math.floor(timestamp / 300); // get unique 5-minute period within unix history
  const fiveMinuteStartUnix = fiveMinuteIndex * 300; // want the rounded effect
  const token5MinuteID = `${token.id}-${fiveMinuteIndex}`;
  const token5MinuteDataRO = await context.Token5MinuteData.get(token5MinuteID);

  const token5MinuteData = token5MinuteDataRO
    ? {...token5MinuteDataRO}
    : {
        id: token5MinuteID,
        periodStartUnix: fiveMinuteStartUnix,
        token_id: token.id,
        volume: 0n,
        tvl: 0n,
        txCount: 0n,
        swapCount: 0n,
        mintCount: 0n,
        burnCount: 0n,
        collectCount: 0n,
      };

  token5MinuteData.tvl = token.tvl;
  token5MinuteData.txCount = token5MinuteData.txCount + 1n;

  context.Token5MinuteData.set(token5MinuteData);
  return {...token5MinuteData};
};

export const updateTokenHourData = async (
  timestamp: number,
  token: Token,
  context: handlerContext,
) => {
  const hourIndex = Math.floor(timestamp / 3600); // get unique hour within unix history
  const hourStartUnix = hourIndex * 3600; // want the rounded effect
  const tokenHourID = `${token.id}-${hourIndex}`;
  const tokenHourDataRO = await context.TokenHourData.get(tokenHourID);

  const tokenHourData = tokenHourDataRO
    ? {...tokenHourDataRO}
    : {
        id: tokenHourID,
        periodStartUnix: hourStartUnix,
        token_id: token.id,
        volume: 0n,
        tvl: 0n,
        txCount: 0n,
        swapCount: 0n,
        mintCount: 0n,
        burnCount: 0n,
        collectCount: 0n,
      };

  tokenHourData.tvl = token.tvl;
  tokenHourData.txCount = tokenHourData.txCount + 1n;

  context.TokenHourData.set(tokenHourData);
  return {...tokenHourData};
};
