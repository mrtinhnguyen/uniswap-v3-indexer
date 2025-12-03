# Hướng dẫn Deploy Uniswap V3 Indexer

## ⚠️ Lưu ý quan trọng về Vercel

**Vercel KHÔNG phù hợp để chạy blockchain indexer** vì:
- Indexer là một **long-running process**, cần chạy liên tục 24/7
- Vercel được thiết kế cho **serverless functions** và **static sites**
- Vercel functions có **timeout giới hạn** (10s cho Hobby, 60s cho Pro)
- Indexer cần giữ kết nối với blockchain và database liên tục

**Giải pháp**: Sử dụng các platform hỗ trợ long-running processes như Railway, Render, hoặc VPS.

## 🚀 Giải pháp đề xuất

### 1. Railway (Khuyến nghị)
- Hỗ trợ long-running processes
- Tự động deploy từ GitHub
- Free tier có sẵn
- Dễ cấu hình

### 2. Render
- Tương tự Railway
- Free tier với một số giới hạn
- Auto-deploy từ GitHub

### 3. DigitalOcean App Platform
- Hỗ trợ tốt cho Node.js apps
- Có free trial

### 4. VPS (Vultr, Linode, AWS EC2)
- Full control
- Cần tự quản lý server

## 📋 Tự động cập nhật pools.txt từ GitHub

### GitHub Actions (Tự động hoàn toàn)

Khi bạn push `pools.txt` lên GitHub, hệ thống sẽ tự động:
1. ✅ GitHub Action cập nhật `config.yaml` từ `pools.txt`
2. ✅ Commit và push lại `config.yaml`
3. ✅ Render phát hiện commit mới và tự động rebuild
4. ✅ Indexer restart với config mới

**Cách sử dụng:**

Khi bạn push `pools.txt` lên GitHub, GitHub Action sẽ tự động:
1. Cập nhật `config.yaml` từ `pools.txt`
2. Commit và push lại `config.yaml`
3. Trigger rebuild trên platform deploy

**Cách sử dụng:**
1. File `.github/workflows/update-config.yml` đã được tạo sẵn
2. Chỉ cần push `pools.txt` lên GitHub (qua web UI hoặc git push)
3. GitHub Action sẽ tự động chạy và cập nhật `config.yaml`
4. Commit mới sẽ trigger auto-deploy trên Railway/Render

**Cấu hình quyền:**
- GitHub Actions tự động có `GITHUB_TOKEN` với quyền write
- Nếu repo là private, đảm bảo Settings > Actions > General > Workflow permissions = "Read and write permissions"

### Cách 2: Webhook API (Nếu deploy trên Vercel cho API endpoint)

Nếu bạn vẫn muốn dùng Vercel cho một số API endpoints:

1. **Tạo GitHub Webhook**:
   - Vào repo Settings > Webhooks > Add webhook
   - Payload URL: `https://your-app.vercel.app/api/update-config`
   - Secret: Tạo secret token và thêm vào Vercel env vars
   - Chỉ trigger khi `pools.txt` thay đổi

2. **Cấu hình Vercel Environment Variables**:
   ```
   UPDATE_CONFIG_SECRET=your-secret-token-here
   ```

3. **API sẽ tự động cập nhật config** khi nhận webhook từ GitHub

## 🔧 Cấu hình cho Railway/Render

### Railway

1. **Kết nối GitHub repo**:
   - Vào Railway dashboard
   - New Project > Deploy from GitHub repo
   - Chọn repo của bạn

2. **Cấu hình Build & Start**:
   ```
   Build Command: pnpm install && pnpm run codegen
   Start Command: pnpm run start
   ```

3. **Environment Variables**:
   - Thêm các biến từ `.env` vào Railway dashboard
   - Ví dụ: `RPC_URL_8453=https://...`

4. **Auto-deploy**:
   - Railway tự động deploy khi có push lên main branch
   - GitHub Action sẽ cập nhật `config.yaml` trước khi deploy

### Render (Khuyến nghị)

Render hỗ trợ tốt cho long-running processes và có free tier.

#### Cách 1: Sử dụng render.yaml (Khuyến nghị)

1. **Kết nối GitHub repo**:
   - Vào [Render Dashboard](https://dashboard.render.com)
   - New > Blueprint (nếu có file `render.yaml`) hoặc New > Web Service
   - Connect GitHub repo của bạn

       2. **Render sẽ tự động detect file `render.yaml`**:
          - File `render.yaml` đã được tạo sẵn trong repo
          - Render sẽ tự động đọc cấu hình từ file này
          - **Lưu ý**: Render có thể dùng yarn mặc định, nhưng buildCommand trong render.yaml sẽ đảm bảo dùng pnpm

3. **Cấu hình Environment Variables**:
   - Vào Service Settings > Environment
   - Thêm các biến môi trường:
     ```
     RPC_URL_8453=https://mainnet.base.org
     # Hoặc RPC URL riêng của bạn
     ```
   - **Lưu ý**: Không commit file `.env` lên GitHub, chỉ set trong Render Dashboard

4. **Cấu hình Auto-deploy**:
   - Settings > Auto-Deploy = "Yes"
   - Render sẽ tự động deploy khi có push lên branch chính
   - GitHub Action sẽ cập nhật `config.yaml` trước khi deploy

#### Cách 2: Cấu hình thủ công (nếu không dùng render.yaml)

1. **Tạo Web Service**:
   - New > Web Service
   - Connect GitHub repo

2. **Cấu hình Build & Start**:
   ```
   Build Command: pnpm install && pnpm run codegen
   Start Command: pnpm run start
   ```

3. **Cấu hình khác**:
   - **Plan**: Chọn "Starter" (có phí) hoặc "Free" (có giới hạn)
   - **Health Check Path**: `/health` (nếu có)
   - **Auto-Deploy**: Bật để tự động deploy khi có commit mới

4. **Environment Variables**: 
   - Thêm các biến từ `.env` vào Render Dashboard
   - Ví dụ: `RPC_URL_8453`, `RPC_URL_1`, v.v.

#### Lưu ý về Render Free Tier:
- Service sẽ sleep sau 15 phút không có traffic
- Cần wake up service trước khi sử dụng
- Không phù hợp cho indexer cần chạy 24/7
- **Khuyến nghị**: Dùng Starter plan ($7/tháng) để đảm bảo service chạy liên tục

## 📝 Workflow hoàn chỉnh với Render

### Quy trình tự động:

1. **Bạn cập nhật `pools.txt` trên GitHub**:
   - Qua GitHub web UI: Edit file > Commit changes
   - Hoặc git push: `git push origin main`

2. **GitHub Action tự động chạy** (trong vòng vài giây):
   - ✅ Đọc `pools.txt`
   - ✅ Validate địa chỉ pool
   - ✅ Cập nhật `config.yaml`
   - ✅ Commit và push lại `config.yaml`

3. **Render tự động phát hiện commit mới**:
   - ✅ Trigger auto-deploy
   - ✅ Chạy build command: `pnpm install && pnpm run codegen`
   - ✅ Chạy start command: `pnpm run start` (tự động chạy `update-config` trước)
   - ✅ Indexer khởi động với config mới

4. **Kết quả**: Indexer đang chạy với danh sách pool mới từ `pools.txt`

**Tổng thời gian**: ~2-5 phút từ lúc cập nhật `pools.txt` đến khi indexer chạy với config mới

## 🔐 Security Notes

- Không commit file `.env` lên GitHub
- Sử dụng secrets trong GitHub Actions
- Sử dụng environment variables trên platform deploy
- Nếu dùng webhook, luôn verify secret token

## 🐛 Troubleshooting

### Lỗi: "Package 'generated' refers to a non-existing file"

**Nguyên nhân**: Render đang dùng yarn và thư mục `generated` chưa tồn tại khi install.

**Giải pháp**:
1. ✅ Đã fix: Xóa `optionalDependencies` trong `package.json` (không cần thiết)
2. ✅ Đã fix: BuildCommand trong `render.yaml` sẽ chạy `codegen` sau `install` để tạo thư mục `generated`
3. Nếu vẫn lỗi, đảm bảo buildCommand là:
   ```yaml
   buildCommand: corepack enable && corepack prepare pnpm@latest --activate && pnpm install && pnpm run codegen
   ```

### Lỗi: "yarn install" thay vì pnpm

**Nguyên nhân**: Render dùng yarn mặc định.

**Giải pháp**: 
- BuildCommand trong `render.yaml` đã được cấu hình để enable pnpm
- Nếu vẫn lỗi, thêm vào Render Dashboard:
  - Settings > Build & Deploy > Build Command: 
    ```
    corepack enable && corepack prepare pnpm@latest --activate && pnpm install && pnpm run codegen
    ```

### GitHub Action không chạy
- Kiểm tra file `.github/workflows/update-config.yml` có đúng format không
- Kiểm tra GitHub Actions permissions trong repo settings
- Đảm bảo workflow có trigger đúng (push paths: pools.txt)

### Config không được cập nhật
- Kiểm tra logs của GitHub Action
- Đảm bảo `pools.txt` có format đúng
- Kiểm tra script `scripts/update-config.js` có chạy được không

### Deploy không trigger sau khi config update
- Kiểm tra platform có auto-deploy enabled không
- Kiểm tra commit message có `[skip ci]` không (sẽ skip một số CI/CD)
- Đảm bảo Render có auto-deploy = true trong render.yaml

