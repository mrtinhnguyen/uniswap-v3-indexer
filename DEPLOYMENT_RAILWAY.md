# Hướng dẫn Deploy lên Railway

## 🚀 Tại sao chọn Railway?

- ✅ **Free tier tốt hơn Render**: 512MB memory, không sleep
- ✅ **Auto-deploy từ GitHub**: Tự động deploy khi có commit
- ✅ **Dễ cấu hình**: Chỉ cần connect repo
- ✅ **Environment variables**: Dễ quản lý
- ✅ **Logs real-time**: Xem logs trực tiếp
- ✅ **Node.js 20**: Sử dụng Node.js 20 (LTS) thay vì Node.js 18 (EOL)

## 📋 Bước 1: Tạo Railway Account

1. Truy cập [Railway](https://railway.app)
2. Sign up với GitHub account
3. Xác thực email

## 📋 Bước 2: Tạo Project mới

1. **New Project** → **Deploy from GitHub repo**
2. Chọn repository của bạn
3. Railway sẽ tự động detect và setup

## 📋 Bước 3: Cấu hình Environment Variables

Vào **Variables** tab và thêm:

### BẮT BUỘC:

```bash
# RPC URL cho Base Mainnet
RPC_URL_8453=https://mainnet.base.org
# Hoặc RPC riêng của bạn (khuyến nghị):
# RPC_URL_8453=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Database Configuration
ENVIO_PG_HOST=your_db_host
ENVIO_PG_PORT=5432
ENVIO_PG_USER=your_db_user
ENVIO_POSTGRES_PASSWORD=your_db_password
ENVIO_PG_DATABASE=your_db_name
```

### TÙY CHỌN (cho Monitoring):

```bash
# Telegram Bot (nếu muốn dùng monitoring)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

## 📋 Bước 4: Setup Database (Nếu chưa có)

Railway có thể tự động tạo PostgreSQL database:

1. **New** → **Database** → **Add PostgreSQL**
2. Railway sẽ tự động tạo database và set environment variables
3. Copy các biến `DATABASE_URL` hoặc `PG*` variables
4. Convert sang `ENVIO_PG_*` format (hoặc dùng script `setup-db-env`)

**Hoặc sử dụng database bên ngoài:**
- Supabase (free tier)
- Neon (free tier)
- Railway PostgreSQL (có phí sau free tier)

## 📋 Bước 5: Cấu hình Build & Deploy

Railway sẽ tự động detect từ:
- `nixpacks.toml` (đã tạo sẵn) - **Ưu tiên**
- `railway.json` (fallback)
- Hoặc cấu hình trong Railway Dashboard

### Build Settings:

Railway sẽ tự động chạy:
```
curl -fsSL https://get.pnpm.io/install.sh | sh -
→ export PNPM_HOME="/root/.local/share/pnpm" && export PATH="$PNPM_HOME:$PATH"
→ pnpm install --no-frozen-lockfile
→ pnpm run codegen
→ node scripts/update-config.js
```

**Lưu ý**: Dùng script install trực tiếp từ pnpm.io thay vì corepack để tránh lỗi signature verification.

**Lưu ý**: Dùng `--no-frozen-lockfile` để tránh lỗi khi lockfile không khớp với package.json (ví dụ: đã xóa `optionalDependencies`).

### Start Command:

```
pnpm run start
```

## 📋 Bước 6: Deploy

1. Railway sẽ tự động deploy khi bạn push code lên GitHub
2. Hoặc click **Deploy** trong Railway Dashboard
3. Xem logs trong **Deployments** tab

## 🔧 Tùy chỉnh (Nếu cần)

### Thay đổi Build Command:

Vào **Settings** → **Build & Deploy** → **Build Command**:
```
corepack enable && corepack prepare pnpm@latest --activate && pnpm install --no-frozen-lockfile && pnpm run codegen && node scripts/update-config.js
```

**Lưu ý**: Nếu Nixpacks vẫn dùng `--frozen-lockfile` mặc định, bạn có thể:
1. Set build command trong Railway Dashboard (override `nixpacks.toml`)
2. Hoặc update `pnpm-lock.yaml` local và commit lại

### Thay đổi Start Command:

Vào **Settings** → **Build & Deploy** → **Start Command**:
```
pnpm run start
```

### Thay đổi Region:

Vào **Settings** → **Region** → Chọn region gần nhất

## 📊 Monitoring & Logs

### Xem Logs:

1. Vào **Deployments** tab
2. Click vào deployment mới nhất
3. Xem **Logs** tab

### Metrics:

Railway cung cấp:
- CPU usage
- Memory usage
- Network traffic
- Request count

## 🔄 Auto-deploy từ GitHub

Railway tự động deploy khi:
- Push lên branch chính (main/master)
- Merge pull request
- Manual trigger từ Dashboard

### GitHub Actions Integration:

Nếu bạn có GitHub Actions để update `config.yaml`:
1. GitHub Action sẽ update `pools.txt` → `config.yaml`
2. Railway sẽ tự động detect commit mới
3. Tự động rebuild và redeploy

## 🐛 Troubleshooting

### Build failed

**Lỗi: "Cannot find matching keyid" hoặc "corepack signature verification failed"**
- ✅ **Đã fix**: `nixpacks.toml` dùng script install trực tiếp từ pnpm.io
- Corepack có thể gặp lỗi signature verification, nên dùng `curl | sh` để install pnpm trực tiếp
- Script này sẽ tự động setup PATH và pnpm environment

**Lỗi: "Node.js 18.x has reached End-Of-Life"**
- ✅ **Đã fix**: `nixpacks.toml` đã update lên Node.js 20
- Railway sẽ tự động dùng Node.js 20 từ `nixpacks.toml`

**Lỗi: "Cannot install with frozen-lockfile" hoặc "lockfile is not up to date"**
- ✅ **Đã fix**: `nixpacks.toml` dùng `--no-frozen-lockfile` để tự động update lockfile
- Nếu vẫn lỗi, có thể do Nixpacks auto-detection override. Thử:
  1. Update lockfile local: `pnpm install` và commit `pnpm-lock.yaml` mới
  2. Hoặc xóa `pnpm-lock.yaml` và để Railway tự tạo lại
  3. Hoặc set trong Railway Dashboard: Build Command = `pnpm install --no-frozen-lockfile && pnpm run codegen && node scripts/update-config.js`

**Lỗi: "JavaScript heap out of memory" hoặc "Out of memory"**
- ✅ **Đã fix**: `nixpacks.toml` và `railway.json` đã set `NODE_OPTIONS='--max-old-space-size=2048'`
- Railway free tier có 512MB memory, nhưng Node.js heap có thể được set cao hơn
- Nếu vẫn lỗi, upgrade lên Pro plan ($5/tháng) hoặc tăng memory limit

**Lỗi: "Generated directory not found"**
- Đảm bảo `codegen` chạy trong build command
- Check logs để xem `codegen` có chạy không

### Deploy failed

**Lỗi: "Cannot connect to database"**
- Kiểm tra `ENVIO_PG_*` variables
- Đảm bảo database accessible từ Railway
- Check database connection string

**Lỗi: "RPC URL not found"**
- Kiểm tra `RPC_URL_8453` variable
- Đảm bảo RPC endpoint hoạt động

### Service không start

**Check logs:**
1. Vào **Deployments** → Latest deployment → **Logs**
2. Tìm lỗi trong logs
3. Common issues:
   - Missing environment variables
   - Database connection failed
   - RPC connection failed

## 💰 Pricing

### Free Tier:
- $5 credit/tháng
- 512MB memory
- 1GB storage
- Unlimited deploys
- **Không sleep** (khác Render free tier)

### Pro Plan ($5/tháng):
- $5 credit/tháng
- 1GB memory
- 5GB storage
- Priority support

## 📝 Checklist trước khi Deploy

- [ ] Railway account đã được tạo
- [ ] Repository đã được connect
- [ ] Environment variables đã được set:
  - [ ] `RPC_URL_8453`
  - [ ] `ENVIO_PG_HOST`
  - [ ] `ENVIO_PG_PORT`
  - [ ] `ENVIO_PG_USER`
  - [ ] `ENVIO_POSTGRES_PASSWORD`
  - [ ] `ENVIO_PG_DATABASE`
  - [ ] `TELEGRAM_BOT_TOKEN` (nếu dùng monitoring)
  - [ ] `TELEGRAM_CHAT_ID` (nếu dùng monitoring)
- [ ] Database đã được setup
- [ ] `pools.txt` đã có pools cần monitor
- [ ] `railway.json` đã được commit

## 🎯 So sánh Railway vs Render

| Feature | Railway | Render Free |
|---------|---------|-------------|
| Memory | 512MB | 512MB |
| Sleep | ❌ Không sleep | ✅ Sleep sau 15 phút |
| Auto-deploy | ✅ | ✅ |
| Database | ✅ Có thể tạo | ❌ Phải tự setup |
| Logs | ✅ Real-time | ✅ |
| Pricing | $5 credit/tháng | Free |

## 🚀 Quick Start

1. **Tạo Railway account**: https://railway.app
2. **New Project** → **Deploy from GitHub**
3. **Set environment variables**
4. **Deploy!**

Railway sẽ tự động:
- ✅ Detect `railway.json`
- ✅ Run build command
- ✅ Start service
- ✅ Auto-deploy khi có commit mới

## 📚 Tài liệu tham khảo

- [Railway Documentation](https://docs.railway.app)
- [Railway Pricing](https://railway.app/pricing)
- [Environment Variables](https://docs.railway.app/develop/variables)

