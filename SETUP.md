# Hướng dẫn Setup Nhanh

## ⚠️ Vấn đề: Indexer không có output sau khi start

Nếu bạn chạy `pnpm run start` và thấy:
```
✅ Hoàn thành! Bạn có thể restart indexer để áp dụng thay đổi.
> generated@0.1.0 start
> ts-node src/Index.res.js
```

Nhưng không có output tiếp theo, đây là các bước để fix:

## 🔧 Bước 1: Tạo file .env

Tạo file `.env` trong thư mục gốc:

```bash
# RPC URL cho Base Mainnet (BẮT BUỘC)
# Base không có trong viem/chains mặc định
RPC_URL_8453=https://mainnet.base.org

# Hoặc sử dụng RPC riêng (khuyến nghị):
# RPC_URL_8453=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
# RPC_URL_8453=https://base-mainnet.infura.io/v3/YOUR_PROJECT_ID
```

## 🗄️ Bước 2: Cấu hình Database

Envio cần PostgreSQL để lưu trữ dữ liệu. Bạn có các lựa chọn:

### Option 1: Local PostgreSQL

1. Cài đặt PostgreSQL:
   ```bash
   # Ubuntu/Debian
   sudo apt install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   ```

2. Tạo database:
   ```bash
   createdb uniswap_v3_indexer
   ```

3. Thêm vào `.env`:
   ```bash
   DATABASE_URL=postgresql://localhost:5432/uniswap_v3_indexer
   ```
   
   **QUAN TRỌNG**: Envio không đọc `DATABASE_URL` trực tiếp! Bạn cần chuyển đổi:
   ```bash
   # Chạy script để tự động chuyển đổi
   pnpm run setup-db-env
   ```
   
   Hoặc thêm thủ công các biến:
   ```bash
   ENVIO_PG_HOST=localhost
   ENVIO_PG_PORT=5432
   ENVIO_PG_USER=postgres
   ENVIO_POSTGRES_PASSWORD=your_password
   ENVIO_PG_DATABASE=uniswap_v3_indexer
   ```

### Option 2: Cloud Database (Khuyến nghị cho production)

**Supabase** (Free tier):
1. Tạo account tại https://supabase.com
2. Tạo project mới
3. Copy connection string từ Settings > Database
4. Thêm vào `.env`:
   ```bash
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   ```

**Neon** (Free tier):
1. Tạo account tại https://neon.tech
2. Tạo database mới
3. Copy connection string
4. Thêm vào `.env`

**Railway** (Free tier):
1. Tạo PostgreSQL service trên Railway
2. Copy connection string
3. Thêm vào `.env`

## 🚀 Bước 3: Chuyển đổi DATABASE_URL (Nếu dùng DATABASE_URL)

**QUAN TRỌNG**: Envio không đọc `DATABASE_URL` trực tiếp. Nếu bạn đã set `DATABASE_URL`, chạy:

```bash
pnpm run setup-db-env
```

Script này sẽ tự động parse `DATABASE_URL` và thêm các biến `ENVIO_PG_*` vào `.env`.

## 🚀 Bước 4: Kiểm tra cấu hình

Kiểm tra các biến môi trường:

```bash
pnpm run check-env
```

## 🚀 Bước 5: Chạy Database Migrations (Lần đầu tiên)

Trước khi start indexer lần đầu, cần chạy migrations để tạo database schema:

```bash
# Chạy migrations (tạo tables)
pnpm run db-setup
```

Hoặc nếu muốn tự động setup đầy đủ:

```bash
# Script tự động: update config + migrations + start
pnpm run start:full
```

## 🚀 Bước 6: Chạy lại

Sau khi cấu hình xong:

```bash
# Cách 1: Start thông thường (đã có migrations)
pnpm run start

# Cách 2: Start với full setup (tự động chạy migrations nếu cần)
pnpm run start:full
```

Bạn sẽ thấy output từ Envio với thông tin về:
- Kết nối database
- Kết nối RPC
- Bắt đầu index blocks
- Progress của việc indexing

**Lưu ý**: Nếu không thấy output ngay, đợi vài giây. Envio có thể đang:
- Kết nối với database
- Kết nối với RPC
- Khởi tạo các components
- Chạy migrations tự động (nếu chưa chạy)

## 🔍 Kiểm tra nếu vẫn không hoạt động

1. **Kiểm tra RPC URL**:
   ```bash
   curl https://mainnet.base.org
   # Hoặc test RPC của bạn
   ```

2. **Kiểm tra Database connection**:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **Chạy với verbose**:
   ```bash
   cd generated
   pnpm start
   ```

4. **Kiểm tra logs**:
   - Xem output trong terminal
   - Kiểm tra thư mục `logs/` nếu có

## ⚠️ Lỗi Hasura (Không nghiêm trọng)

Nếu bạn thấy lỗi:
```
ERROR: connect ECONNREFUSED 127.0.0.1:8080
There was an issue tracking tables in hasura - indexing may still work
```

**Đây không phải lỗi nghiêm trọng!** Indexer vẫn sẽ chạy và index dữ liệu. Lỗi này chỉ có nghĩa là:
- Hasura GraphQL Engine không chạy (không có GraphQL API)
- Bạn vẫn có thể query database trực tiếp qua PostgreSQL
- Indexing vẫn hoạt động bình thường

### Giải pháp 1: Tắt Hasura (Nếu không cần GraphQL API)

Thêm vào file `.env`:
```bash
ENVIO_HASURA=false
```

### Giải pháp 2: Setup Hasura (Nếu cần GraphQL API)

1. **Sử dụng Docker Compose** (khuyến nghị):
   ```bash
   cd generated
   docker-compose up -d
   ```
   Điều này sẽ start Hasura GraphQL Engine trên port 8080.

2. **Hoặc cấu hình Hasura endpoint** trong `.env`:
   ```bash
   HASURA_GRAPHQL_ENDPOINT=http://your-hasura-instance:8080/v1/metadata
   HASURA_GRAPHQL_ADMIN_SECRET=your-secret
   ```

**Khuyến nghị**: Nếu bạn chỉ cần index dữ liệu và query trực tiếp qua PostgreSQL, tắt Hasura bằng cách set `ENVIO_HASURA=false`.

## 📝 Lưu ý

- **Base Mainnet**: Bắt buộc phải set `RPC_URL_8453` vì Base không có trong viem/chains
- **Database**: Envio cần PostgreSQL, không thể dùng SQLite
- **RPC Rate Limits**: Nên dùng RPC riêng (Alchemy, Infura) để tránh rate limits
- **Hasura**: Không bắt buộc - chỉ cần nếu bạn muốn dùng GraphQL API

