
This is a fork of https://github.com/enviodev/uniswap-v3-indexer with some modifications:

- Store everything as BigInts with the exact same precision as they appear on-chain, instead of BigDecimal.
- Track fees as fees0 and fees1 separately instead of the previous feesUSD, which becomes highly misleading as it accumulates over time.
- Add tracking LP positions.
- Add tracking feeGrowthOutside0X128 and feeGrowthOutside1X128 for ticks.
- Add gts for linting.
- Remove tracking token prices in USD/ETH.
- Remove the token whitelist and several redundant or unnecessary fields.

These changes add a lot of valuable data to the index while also making indexing significantly faster and taking less storage space.
