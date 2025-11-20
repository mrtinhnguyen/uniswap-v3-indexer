
This is a fork of https://github.com/enviodev/uniswap-v3-indexer with some modifications:

- Store everything as BigInts with the exact same precision as they appear on-chain, instead of BigDecimal.
- Track fees as fees0 and fees1 separately instead of the previous feesUSD which becomes highly misleading as it accumulates over time.
- Add tracking liquidity providers and positions.
- Add fields like swapCount, positionsCount, etc. to make querying easier.
- Add gts for linting.
- Remove tracking token prices in USD/ETH.
- Remove the token whitelist and several redundant or unnecessary fields.

