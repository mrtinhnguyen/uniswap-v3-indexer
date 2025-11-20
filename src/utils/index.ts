import {handlerContext, Transaction} from 'generated';
export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

// Q128 constant for fee growth precision (Q128.128 format)
export const Q128 = 2n ** 128n;

// Helper function to calculate fees from amount and fee tier
export const calculateFees = (amount: bigint, feeTier: bigint): bigint => {
  return (amount * feeTier) / 1000000n;
};

// Helper function to calculate absolute value
export const abs = (value: bigint): bigint => {
  return value < 0n ? -value : value;
};

// Helper function to update global fee growth
export const updateFeeGrowth = (
  currentFeeGrowth: bigint,
  fees: bigint,
  liquidity: bigint,
): bigint => {
  if (liquidity === 0n) {
    return currentFeeGrowth;
  }
  return currentFeeGrowth + (fees * Q128) / liquidity;
};

// Helper function to calculate fee growth outside when tick is crossed
export const flipFeeGrowthOutside = (
  feeGrowthGlobal: bigint,
  feeGrowthOutside: bigint,
): bigint => {
  return feeGrowthGlobal - feeGrowthOutside;
};

// Helper function to get the list of ticks that were crossed
export const getTicksCrossed = (oldTick: bigint, newTick: bigint): bigint[] => {
  const ticksCrossed: bigint[] = [];

  if (newTick > oldTick) {
    // Price went up, crossed ticks from oldTick to newTick
    for (let i = oldTick + 1n; i <= newTick; i++) {
      ticksCrossed.push(i);
    }
  } else if (newTick < oldTick) {
    // Price went down, crossed ticks from oldTick to newTick
    for (let i = oldTick; i > newTick; i--) {
      ticksCrossed.push(i);
    }
  }

  return ticksCrossed;
};

export const loadTransaction = async (
  txHash: string,
  blockNumber: number,
  timestamp: number,
  gasPrice: bigint,
  context: handlerContext,
): Promise<Transaction> => {
  const txRO = await context.Transaction.get(txHash);
  const transaction = txRO
    ? {...txRO}
    : {
        id: txHash,
        blockNumber: 0,
        timestamp: 0,
        gasUsed: 0n, //needs to be moved to transaction receipt
        gasPrice: 0n,
      };

  transaction.blockNumber = blockNumber;
  transaction.timestamp = timestamp;
  transaction.gasUsed = 0n; //needs to be moved to transaction receipt
  transaction.gasPrice = gasPrice;

  context.Transaction.set(transaction as Transaction);
  return transaction as Transaction;
};

// Helper function to calculate fee growth inside a position's tick range
export const getFeeGrowthInside = (
  feeGrowthGlobal: bigint,
  feeGrowthOutsideLower: bigint,
  feeGrowthOutsideUpper: bigint,
  tickLower: bigint,
  tickUpper: bigint,
  currentTick: bigint,
): bigint => {
  let feeGrowthBelow: bigint;
  let feeGrowthAbove: bigint;

  // Calculate fee growth below the lower tick
  if (currentTick >= tickLower) {
    feeGrowthBelow = feeGrowthOutsideLower;
  } else {
    feeGrowthBelow = feeGrowthGlobal - feeGrowthOutsideLower;
  }

  // Calculate fee growth above the upper tick
  if (currentTick < tickUpper) {
    feeGrowthAbove = feeGrowthOutsideUpper;
  } else {
    feeGrowthAbove = feeGrowthGlobal - feeGrowthOutsideUpper;
  }

  // Fee growth inside is global minus outside
  return feeGrowthGlobal - feeGrowthBelow - feeGrowthAbove;
};

// Helper function to calculate tokens owed (uncollected fees)
export const calculateTokensOwed = (
  liquidity: bigint,
  feeGrowthInside: bigint,
  feeGrowthInsideLast: bigint,
): bigint => {
  return (liquidity * (feeGrowthInside - feeGrowthInsideLast)) / 2n ** 128n;
};
