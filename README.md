# Uniswap V3 Indexer

Đây là một fork của [enviodev/uniswap-v3-indexer](https://github.com/enviodev/uniswap-v3-indexer) với một số cải tiến và thay đổi.

## 📋 Tổng quan

Dự án này là một indexer cho Uniswap V3 được xây dựng bằng [Envio](https://www.envio.dev/), một framework để index dữ liệu blockchain. Indexer này theo dõi và lưu trữ tất cả các sự kiện từ các pool Uniswap V3, bao gồm swaps, mints, burns, collects, và các vị trí thanh khoản.

### 🎯 Mục đích sử dụng

Xem file [USE_CASES.md](./USE_CASES.md) để biết chi tiết về:
- **Nếu bạn có pool riêng**: Theo dõi performance, quản lý positions, tối ưu strategies
- **Nếu bạn monitor pool người khác**: Market research, arbitrage opportunities, competitor analysis
- **Use cases nâng cao**: Trading bots, portfolio management, analytics platforms

**Tóm tắt**: Indexer cung cấp dữ liệu chi tiết và lịch sử để bạn có thể đưa ra quyết định tốt hơn, tự động hóa processes, và tối ưu strategies.

## ✨ Tính năng chính

- **Lưu trữ chính xác**: Sử dụng BigInt với độ chính xác giống hệt như trên blockchain, thay vì BigDecimal
- **Theo dõi phí riêng biệt**: Lưu trữ `fees0` và `fees1` riêng biệt thay vì `feesUSD` (tránh sai lệch khi tích lũy theo thời gian)
- **Theo dõi Liquidity Providers**: Theo dõi các nhà cung cấp thanh khoản và vị trí của họ
- **Trường dữ liệu bổ sung**: Thêm các trường như `swapCount`, `positionsCount`, `lpCount`, v.v. để dễ dàng truy vấn
- **Hỗ trợ đa chain**: Có thể index nhiều blockchain cùng lúc
- **Dữ liệu thời gian thực**: Tự động cập nhật dữ liệu theo thời gian thực từ blockchain
- **📱 Telegram Alerts**: Nhận thông báo real-time qua Telegram Bot về pool performance, whale activity, và position fees (xem [MONITORING.md](./MONITORING.md))
- **🔄 Tự động hóa hoàn toàn**: Pools tự động sync từ `pools.txt`, monitoring tự động start, alerts tự động gửi (xem [DEPLOYMENT_MONITORING.md](./DEPLOYMENT_MONITORING.md))

## 🔧 Yêu cầu hệ thống

- **Node.js**: >= 18.0.0
- **Bun**: >= 1.0.0 (tùy chọn, có thể sử dụng thay cho Node.js)
- **pnpm**: Để quản lý dependencies

⚠️ **Lưu ý quan trọng cho Windows**: Envio hiện tại **không hỗ trợ Windows native**. Nếu bạn đang sử dụng Windows, bạn cần:

- **Sử dụng WSL (Windows Subsystem for Linux)** - Khuyến nghị
- **Sử dụng Docker** 
- **Sử dụng máy ảo Linux**

Xem phần [Troubleshooting](#-troubleshooting) để biết thêm chi tiết.

## 📦 Cài đặt

1. **Clone repository**:
   ```bash
   git clone <repository-url>
   cd uniswap-v3-indexer
   ```

2. **Cài đặt dependencies**:
   ```bash
   pnpm install
   ```

3. **Generate code** (tạo các file code từ schema GraphQL):
   ```bash
   pnpm run codegen
   ```

   ⚠️ **Nếu bạn đang dùng Windows**: Envio không hỗ trợ Windows native. Vui lòng xem phần [Troubleshooting](#-troubleshooting) để biết cách xử lý.

## ⚙️ Cấu hình

### 1. Cấu hình mạng blockchain (config.yaml)

File `config.yaml` chứa cấu hình chính của indexer. Bạn có thể cấu hình địa chỉ pool theo 2 cách:

#### Cách 1: Quản lý pool qua file pools.txt (Khuyến nghị)

Đây là cách dễ dàng nhất để quản lý danh sách pool, đặc biệt khi bạn cần cập nhật thường xuyên mà không cần build lại ứng dụng.

1. **Chỉnh sửa file `pools.txt`** trong thư mục gốc:
   ```txt
   # Danh sách địa chỉ pool Uniswap V3 trên Base Mainnet
   # Mỗi dòng là một địa chỉ pool (có thể có comment sau dấu #)
   
   0x16905890A1D02b6F824387419319Bf4188B961b0  # Pool mẫu
   0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8  # USDC/ETH pool
   0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640  # USDC/ETH pool (0.05%)
   ```

2. **Cập nhật config.yaml từ pools.txt**:
   ```bash
   # Cập nhật thủ công
   pnpm run update-config
   
   # Hoặc tự động theo dõi và cập nhật khi pools.txt thay đổi
   pnpm run watch-pools
   ```

3. **Restart indexer** để áp dụng thay đổi:
   ```bash
   pnpm run dev
   # hoặc
   pnpm run start
   ```

**Lưu ý**: 
- File `pools.txt` có thể được cập nhật bất cứ lúc nào
- Chạy `pnpm run update-config` sau khi chỉnh sửa `pools.txt` để cập nhật `config.yaml`
- Hoặc chạy `pnpm run watch-pools` trong một terminal riêng để tự động sync
- Script sẽ tự động validate địa chỉ và bỏ qua các dòng không hợp lệ

#### Cách 2: Chỉnh sửa trực tiếp config.yaml

Bạn cũng có thể chỉnh sửa trực tiếp file `config.yaml`:

```yaml
networks:
  - id: 8453 # Base Mainnet
    start_block: 0 # Block bắt đầu index
    contracts:
      - name: UniswapV3Pool
        address:
          - 0x16905890A1D02b6F824387419319Bf4188B961b0 # Địa chỉ pool
          - 0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8 # Pool khác
```

**Ví dụ cấu hình cho Ethereum Mainnet**:
```yaml
networks:
  - id: 1 # Ethereum Mainnet
    start_block: 12345678 # Block bắt đầu (nên đặt từ block pool được tạo)
    contracts:
      - name: UniswapV3Pool
        address:
          - 0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8 # USDC/ETH pool
          - 0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640 # USDC/ETH pool (0.05%)
```

### 2. Cấu hình Environment Variables

Tạo file `.env` trong thư mục gốc của dự án (copy từ `.env.example`):

```bash
cp .env.example .env
```

Sau đó chỉnh sửa file `.env`:

```bash
# RPC URL cho Base Mainnet (Chain ID: 8453)
# BẮT BUỘC: Base không có trong viem/chains mặc định
RPC_URL_8453=https://mainnet.base.org
# Hoặc sử dụng RPC riêng của bạn (khuyến nghị):
# RPC_URL_8453=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Database Configuration (PostgreSQL)
# Envio sử dụng PostgreSQL để lưu trữ dữ liệu
DATABASE_URL=postgresql://uniswap_v3_indexer:TicketX123@103.104.119.144:5432/uniswap_v3_indexer
```

**Lưu ý quan trọng**: 
- **Base Mainnet (8453)**: Bạn **BẮT BUỘC** phải cung cấp RPC URL vì Base không có trong viem/chains mặc định
- **Database**: Envio cần PostgreSQL để lưu trữ dữ liệu. Bạn có thể:
  - Sử dụng PostgreSQL local
  - Sử dụng cloud database (Supabase, Neon, Railway, v.v.)
  - Hoặc để Envio tự tạo database (nếu hỗ trợ)
- **RPC URL**: Nên sử dụng RPC riêng (Alchemy, Infura, QuickNode) để tránh rate limits

### 3. Cấu hình Schema (schema.graphql)

File `schema.graphql` định nghĩa cấu trúc dữ liệu được index. Bạn có thể tùy chỉnh các entity và trường dữ liệu theo nhu cầu.

## 🚀 Chạy dự án

### Chế độ Development

Chạy indexer ở chế độ development với hot-reload:

```bash
pnpm run dev
```

**Lưu ý**: Script `dev` và `start` sẽ tự động chạy `update-config` trước khi khởi động indexer để đảm bảo `config.yaml` được cập nhật từ `pools.txt`.

### Chế độ Production

Chạy indexer ở chế độ production:

```bash
pnpm run start
```

### Tự động cập nhật pool từ file txt

Nếu bạn muốn tự động cập nhật `config.yaml` khi `pools.txt` thay đổi (không cần restart indexer thủ công):

1. **Mở một terminal riêng** và chạy file watcher:
   ```bash
   pnpm run watch-pools
   ```

2. **Chỉnh sửa file `pools.txt`** bất cứ lúc nào - script sẽ tự động phát hiện và cập nhật `config.yaml`

3. **Restart indexer** khi cần (indexer sẽ tự động load config mới khi restart)

### Các lệnh khác

- **Generate code**: Tạo lại code từ schema GraphQL
  ```bash
  pnpm run codegen
  ```

- **Update config**: Cập nhật config.yaml từ pools.txt
  ```bash
  pnpm run update-config
  ```

- **Watch pools**: Tự động theo dõi và cập nhật config khi pools.txt thay đổi
  ```bash
  pnpm run watch-pools
  ```

- **Lint code**: Kiểm tra lỗi code style
  ```bash
  pnpm run lint
  ```

- **Fix lint errors**: Tự động sửa lỗi lint
  ```bash
  pnpm run fix
  ```

- **Run tests**: Chạy test suite
  ```bash
  pnpm run test
  ```

- **Clean build**: Xóa các file build
  ```bash
  pnpm run clean
  ```

## 📁 Cấu trúc dự án

```
uniswap-v3-indexer/
├── config.yaml              # Cấu hình indexer (networks, contracts, events)
├── schema.graphql           # Định nghĩa schema dữ liệu
├── package.json             # Dependencies và scripts
├── tsconfig.json            # Cấu hình TypeScript
├── src/
│   ├── EventHandlers.ts     # Import tất cả handlers
│   ├── handlers/            # Xử lý các events
│   │   ├── initialize.ts   # Xử lý event Initialize
│   │   ├── swap.ts         # Xử lý event Swap
│   │   ├── mint.ts         # Xử lý event Mint
│   │   ├── burn.ts         # Xử lý event Burn
│   │   └── collect.ts      # Xử lý event Collect
│   ├── effects/             # Effects để gọi RPC
│   │   ├── getPoolData.ts  # Lấy thông tin pool
│   │   └── getTokenMetadata.ts # Lấy metadata token
│   ├── utils/              # Utilities
│   │   ├── rpc.ts          # Cấu hình RPC client
│   │   ├── index.ts        # Utilities chung
│   │   └── intervalUpdates.ts # Cập nhật dữ liệu theo khoảng thời gian
│   └── abi/                # ABI của contracts
│       └── IUniswapV3Pool.ts
└── generated/              # Code được generate từ schema (tự động tạo)
```

## 📊 Các Entity chính

Indexer này theo dõi các entity sau:

- **Token**: Thông tin về các token (symbol, name, decimals, volume, TVL, v.v.)
- **Pool**: Thông tin về các pool Uniswap V3 (liquidity, price, fees, volume, v.v.)
- **Position**: Vị trí thanh khoản của các LP
- **LiquidityProvider**: Thông tin về các nhà cung cấp thanh khoản
- **Swap**: Các giao dịch swap
- **Mint**: Các sự kiện thêm thanh khoản
- **Burn**: Các sự kiện rút thanh khoản
- **Collect**: Các sự kiện thu phí
- **Tick**: Thông tin về các tick trong pool
- **Transaction**: Thông tin về các transaction
- **PoolDayData / PoolHourData / Pool5MinuteData**: Dữ liệu thống kê theo thời gian
- **TokenDayData / TokenHourData / Token5MinuteData**: Dữ liệu thống kê token theo thời gian

## 🔍 Truy vấn dữ liệu

Sau khi indexer chạy, bạn có thể truy vấn dữ liệu theo 2 cách:

### Cách 1: Query trực tiếp qua PostgreSQL (Khuyến nghị)

Query trực tiếp database PostgreSQL:

```sql
-- Lấy danh sách pools
SELECT * FROM "Pool" LIMIT 10;

-- Lấy thông tin token
SELECT * FROM "Token" WHERE symbol = 'USDC';

-- Lấy swaps gần đây
SELECT * FROM "Swap" ORDER BY timestamp DESC LIMIT 10;
```

### Cách 2: GraphQL API qua Hasura (Tùy chọn)

Nếu bạn muốn dùng GraphQL API, cần setup Hasura:

1. **Start Hasura với Docker**:
   ```bash
   cd generated
   docker-compose up -d
   ```

2. **Truy cập GraphQL endpoint**: `http://localhost:8080/v1/graphql`

3. **Ví dụ truy vấn GraphQL**:
   ```graphql
   query {
     Pool(limit: 10, order_by: {volume0: desc}) {
       id
       address
       token0 {
         symbol
         name
       }
       token1 {
         symbol
         name
       }
       liquidity
       volume0
       volume1
       fees0
       fees1
       swapCount
     }
   }
   ```

**Lưu ý**: Nếu không cần GraphQL API, bạn có thể tắt Hasura bằng cách thêm vào `.env`:
```bash
ENVIO_HASURA=false
```

## ⚠️ Lưu ý

1. **Block bắt đầu**: Nên đặt `start_block` gần với block mà pool được tạo để tránh index lại quá nhiều dữ liệu không cần thiết
2. **RPC Rate Limits**: Nếu sử dụng RPC công cộng, có thể gặp rate limits. Nên sử dụng RPC riêng hoặc có API key
3. **Dung lượng lưu trữ**: Indexer sẽ lưu trữ rất nhiều dữ liệu, đảm bảo có đủ dung lượng
4. **Reorgs**: Indexer được cấu hình với `rollback_on_reorg: true` để tự động rollback khi có reorg

## 🛠️ Troubleshooting

### Lỗi kết nối RPC
- Kiểm tra RPC URL trong file `.env`
- Đảm bảo RPC endpoint đang hoạt động
- Kiểm tra rate limits nếu sử dụng RPC công cộng

### Lỗi khi generate code

**Lỗi: `Couldn't find envio binary inside node_modules for windows-x64`**

⚠️ **Envio không hỗ trợ Windows native**. Package chỉ có binary cho Linux và macOS. Bạn **bắt buộc** phải sử dụng một trong các giải pháp sau:

#### Giải pháp 1: Sử dụng WSL (Windows Subsystem for Linux) - Khuyến nghị

1. **Cài đặt WSL** (nếu chưa có):
   ```powershell
   # Chạy trong PowerShell với quyền Administrator
   wsl --install
   ```

2. **Mở WSL và chuyển vào thư mục dự án**:
   ```bash
   # Trong WSL
   cd /mnt/d/TonyX.Dev/BlockChain/uniswap-v3-indexer
   # Hoặc đường dẫn tương ứng của bạn
   ```

3. **Cài đặt Node.js và pnpm trong WSL**:
   ```bash
   # Cài đặt Node.js (sử dụng nvm)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   
   # Cài đặt pnpm
   npm install -g pnpm
   ```

4. **Chạy các lệnh trong WSL**:
   ```bash
   pnpm install
   pnpm run codegen
   ```

#### Giải pháp 2: Sử dụng Docker

Tạo file `Dockerfile`:
```dockerfile
FROM node:18

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .

CMD ["pnpm", "run", "dev"]
```

Chạy với Docker:
```bash
docker build -t uniswap-v3-indexer .
docker run -it -v ${PWD}:/app uniswap-v3-indexer
```

#### Giải pháp 3: Sử dụng máy ảo Linux

Cài đặt Ubuntu hoặc distro Linux khác trong VirtualBox/VMware và chạy dự án trong đó.

**Lỗi khác khi generate code**:
```bash
# Xóa thư mục generated và generate lại
rm -rf generated
pnpm run codegen
```

### Indexer không bắt đầu
- Kiểm tra `config.yaml` có đúng format không
- Kiểm tra địa chỉ pool có đúng không
- Kiểm tra chain ID có đúng không

## 📝 Thay đổi so với bản gốc

- ✅ Lưu trữ mọi thứ dưới dạng BigInt với độ chính xác giống hệt trên-chain, thay vì BigDecimal
- ✅ Theo dõi phí riêng biệt (`fees0`, `fees1`) thay vì `feesUSD`
- ✅ Thêm tracking cho liquidity providers và positions
- ✅ Thêm các trường như `swapCount`, `positionsCount`, `lpCount` để dễ truy vấn
- ✅ Thêm gts cho linting
- ❌ Loại bỏ tracking giá token bằng USD/ETH
- ❌ Loại bỏ token whitelist và các trường dữ liệu không cần thiết

## 🚀 Deploy lên Render và Tự động cập nhật từ GitHub

Xem file [DEPLOYMENT.md](./DEPLOYMENT.md) để biết hướng dẫn chi tiết về:
- Cách deploy indexer lên Render (khuyến nghị)
- Tự động cập nhật `config.yaml` khi `pools.txt` thay đổi trên GitHub
- Sử dụng GitHub Actions để tự động sync
- Cấu hình environment variables

**Tóm tắt nhanh**: 
1. ✅ Deploy lên Render (sử dụng file `render.yaml` có sẵn)
2. ✅ Cập nhật `pools.txt` trên GitHub bất cứ lúc nào
3. ✅ GitHub Action tự động cập nhật `config.yaml`
4. ✅ Render tự động rebuild và restart indexer với config mới

**Không cần build lại ứng dụng** - chỉ cần cập nhật `pools.txt` trên GitHub!

## 📄 License

Xem file LICENSE trong repository gốc.

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng tạo issue hoặc pull request.
