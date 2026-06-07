---
sidebar_position: 2
title: Triển khai Self-host
description: Hướng dẫn cài đặt, cấu hình, vận hành và cập nhật AWE trên máy chủ riêng bằng Docker Compose.
---

# Triển khai AWE Self-host

AWE Self-host cho phép chạy toàn bộ nền tảng trên máy chủ riêng bằng Docker Compose. Bộ triển khai sử dụng các Docker image đã được build sẵn, vì vậy máy chủ không cần cài đặt .NET SDK hoặc Node.js.

## 1. Thành phần hệ thống

| Dịch vụ | Vai trò |
| --- | --- |
| `frontend` | Giao diện AWE, đồng thời proxy `/api` và `/hubs/*` tới API Gateway. |
| `api-gateway` | Cung cấp API, xác thực JWT và SignalR cho frontend. |
| `worker-engine` | Điều phối quá trình thực thi workflow. |
| `worker` | Thực thi plugin và xử lý công việc từ hàng đợi. |
| `postgres` | Lưu workflow, execution và dữ liệu Keycloak. |
| `rabbitmq` | Message broker giữa API Gateway và các worker. |
| `redis` | Cache và trạng thái dùng chung. |
| `minio` | Object storage cho plugin package. |
| `keycloak` | Đăng nhập, phát hành token và quản lý người dùng. |
| `aspire-dashboard` | Theo dõi log, trace và metric OpenTelemetry. |
| `otel-collector` | Thu thập telemetry từ các dịch vụ. |

PostgreSQL, RabbitMQ, Redis và MinIO sử dụng Docker volume để giữ dữ liệu khi container được khởi động lại hoặc tạo lại.

## 2. Yêu cầu

- Linux server là môi trường khuyến nghị. Có thể chạy trên Windows bằng Docker Desktop và WSL 2.
- Docker Engine và Docker Compose v2.
- Git để tải bộ triển khai.
- Tối thiểu nên có 4 CPU, 8 GB RAM và 20 GB dung lượng trống.
- Máy chủ có thể truy cập Docker Hub, GHCR, Quay và Microsoft Container Registry.

Kiểm tra Docker:

```bash
docker --version
docker compose version
```

Nếu các AWE image trên GHCR ở chế độ private, đăng nhập trước khi pull:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-username> --password-stdin
```

Token cần quyền đọc package (`read:packages`).

## 3. Tải bộ triển khai

```bash
git clone https://github.com/Ttanhsonsisu/AWE-self-host.git
cd AWE-self-host
cp .env.example .env
```

Không commit tệp `.env` vì tệp này chứa mật khẩu và token của hệ thống.

## 4. Cấu hình `.env`

Mở `.env` và thay toàn bộ giá trị `change_me`. Các biến quan trọng:

| Biến | Ý nghĩa | Giá trị gợi ý khi chạy local |
| --- | --- | --- |
| `IMAGE_REGISTRY` | Registry chứa bốn AWE image. | `ghcr.io/ttanhsonsisu` |
| `IMAGE_TAG` | Phiên bản image. Nên khóa theo release khi chạy production. | `latest` |
| `POSTGRES_PASSWORD` | Mật khẩu PostgreSQL. | Chuỗi ngẫu nhiên mạnh |
| `REDIS_PASSWORD` | Mật khẩu Redis. | Chuỗi ngẫu nhiên mạnh |
| `RABBITMQ_DEFAULT_PASS` | Mật khẩu được tạo trong RabbitMQ. | Chuỗi ngẫu nhiên mạnh |
| `RABBITMQ_PASSWORD` | Mật khẩu các dịch vụ AWE dùng để kết nối RabbitMQ. | Giống `RABBITMQ_DEFAULT_PASS` |
| `MINIO_ROOT_PASSWORD` | Mật khẩu quản trị MinIO. | Chuỗi ngẫu nhiên mạnh |
| `KEYCLOAK_ADMIN_PASSWORD` | Mật khẩu quản trị Keycloak. | Chuỗi ngẫu nhiên mạnh |
| `OIDC_CLIENT_SECRET` | Secret của client `aspire-dashboard`. | Chuỗi ngẫu nhiên mạnh |
| `DASHBOARD_OTLP_TOKEN` | API key gửi telemetry tới Aspire Dashboard. | Chuỗi ngẫu nhiên mạnh |

Có thể sinh secret bằng OpenSSL:

```bash
openssl rand -hex 32
```

### Cấu hình RabbitMQ

`RABBITMQ_AMQP_PORT` là cổng công khai trên máy chủ, còn các container kết nối RabbitMQ qua cổng nội bộ `5672`. Cấu hình:

```dotenv
RABBITMQ_AMQP_PORT=5673
RABBITMQ_PORT=5672
RABBITMQ_DEFAULT_VHOST=awe-system
RABBITMQ_VHOST=awe-system
```

Hai biến mật khẩu phải giống nhau:

```dotenv
RABBITMQ_DEFAULT_PASS=<mat-khau-rabbitmq>
RABBITMQ_PASSWORD=<mat-khau-rabbitmq>
```

:::warning
Tệp `docker-compose.yml` mount `./rabbitmq.conf`. Trước khi khởi động, hãy bảo đảm `rabbitmq.conf` là một tệp, không phải thư mục. Nếu bản cài đặt chưa có tệp này, tạo tệp với nội dung tối thiểu:

```ini
vm_memory_high_watermark.relative = 0.7
disk_free_limit.absolute = 2GB
listeners.tcp.default = 5672
log.console = true
log.console.level = info
heartbeat = 60
```
:::

### Cấu hình URL local

Khi truy cập AWE trực tiếp trên máy cài đặt:

```dotenv
OIDC_AUTHORITY=http://localhost:8081/realms/awe-auth
OIDC_REDIRECT_URI=http://localhost/
OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost/
FRONTEND_API_URL=/api
FRONTEND_SIGNALR_URL=/hubs/workflow
```

Giữ `KEYCLOAK_INTERNAL_AUTHORITY` là địa chỉ Docker nội bộ:

```dotenv
KEYCLOAK_INTERNAL_AUTHORITY=http://awe-keycloak:8080/realms/awe-auth
```

Không đổi biến này thành `localhost`, vì API Gateway chạy bên trong container.

### Cloudflare Tunnel

Compose hiện có dịch vụ `cloudflare-tunnel`. Nếu sử dụng Cloudflare Tunnel, thêm:

```dotenv
CLOUDFLARE_TUNNEL_TOKEN=<cloudflare-tunnel-token>
```

Nếu không sử dụng, hãy bỏ hoặc comment dịch vụ `cloudflare-tunnel` trong `docker-compose.yml`. Việc để token rỗng làm riêng container này khởi động lỗi, dù các dịch vụ AWE khác vẫn có thể hoạt động.

## 5. Kiểm tra và khởi động

Kiểm tra cấu hình Compose trước khi tạo container:

```bash
docker compose config --quiet
```

Tải image và khởi động:

```bash
docker compose pull
docker compose up -d
```

Theo dõi trạng thái:

```bash
docker compose ps
docker compose logs -f
```

Lần khởi động đầu có thể mất vài phút vì PostgreSQL cần tạo database, Keycloak cần import realm `awe-auth`, và các worker phải chờ RabbitMQ sẵn sàng.

### Cài đặt bằng script

Trên Linux hoặc macOS có thể dùng:

```bash
chmod +x install.sh
./install.sh
```

Script tự tạo `.env` từ `.env.example` và sinh mật khẩu nếu `.env` chưa tồn tại. Tuy nhiên, cần cập nhật `IMAGE_REGISTRY` trong `.env.example` trước khi chạy; nếu không, script sẽ cố pull image từ giá trị mẫu `ghcr.io/your-org`.

Trên Windows PowerShell, nên thực hiện các lệnh Docker Compose thủ công ở trên hoặc chạy script qua WSL/Git Bash.

## 6. Cấu hình đăng nhập lần đầu

Mở Keycloak Admin Console:

```text
http://localhost:8081
```

Đăng nhập bằng:

- Username: giá trị `KEYCLOAK_ADMIN_USER`.
- Password: giá trị `KEYCLOAK_ADMIN_PASSWORD`.

Realm `awe-auth` được import tự động từ thư mục `keycloak-init`.

### Cập nhật client frontend

Trong **Clients → awe-fe**, cấu hình:

| Trường | Local | Production ví dụ |
| --- | --- | --- |
| Valid redirect URIs | `http://localhost/*` | `https://awe.example.com/*` |
| Valid post logout redirect URIs | `http://localhost/*` | `https://awe.example.com/*` |
| Web origins | `http://localhost` | `https://awe.example.com` |

Giá trị này phải khớp với `OIDC_REDIRECT_URI` và `OIDC_POST_LOGOUT_REDIRECT_URI` trong `.env`.

### Tạo người dùng AWE

Realm import không tạo sẵn tài khoản người dùng thông thường:

1. Mở **Users → Create new user**.
2. Nhập username, email và bật **Enabled**.
3. Mở tab **Credentials** và đặt mật khẩu.
4. Tắt **Temporary** nếu không muốn buộc đổi mật khẩu ở lần đăng nhập đầu.

Sau đó mở frontend và đăng nhập bằng tài khoản vừa tạo.

## 7. Địa chỉ truy cập mặc định

| Thành phần | Địa chỉ |
| --- | --- |
| AWE Frontend | `http://localhost` |
| API Gateway | `http://localhost:8080` |
| Keycloak | `http://localhost:8081` |
| Aspire Dashboard | `http://localhost:19888` |
| RabbitMQ Management | `http://localhost:15673` |
| MinIO Console | `http://localhost:9001` |
| RedisInsight | `http://localhost:5541` |

Khi thay đổi các biến `*_PORT`, sử dụng cổng mới thay cho giá trị trong bảng.

## 8. Triển khai bằng domain và HTTPS

Khi chạy trên máy chủ thật, nên đặt reverse proxy như Nginx, Caddy hoặc Cloudflare Tunnel phía trước frontend và Keycloak.

Ví dụ:

```dotenv
ASPNETCORE_ENVIRONMENT=production
OIDC_AUTHORITY=https://auth.example.com/realms/awe-auth
OIDC_REDIRECT_URI=https://awe.example.com/
OIDC_POST_LOGOUT_REDIRECT_URI=https://awe.example.com/
```

Sau đó cập nhật client `awe-fe` trong Keycloak theo đúng domain HTTPS. Không công khai trực tiếp cổng PostgreSQL, Redis, RabbitMQ AMQP, MinIO API hoặc OTLP ra Internet. Chỉ mở các cổng thực sự cần thiết trên firewall.

:::info
Các biến cấu hình frontend được ghi vào `config.js` khi container khởi động. Sau khi sửa `.env`, chỉ cần tạo lại container; không cần build lại frontend.
:::

```bash
docker compose up -d --force-recreate frontend api-gateway
```

## 9. Vận hành thường ngày

### Xem log

```bash
docker compose logs -f api-gateway
docker compose logs -f worker-engine worker
docker compose logs --tail=200 keycloak
```

### Khởi động lại

```bash
docker compose restart
```

Khởi động lại một dịch vụ:

```bash
docker compose restart api-gateway
```

### Dừng hệ thống

```bash
docker compose down
```

Lệnh trên giữ nguyên dữ liệu trong Docker volumes.

:::danger
Không chạy `docker compose down -v` nếu chưa sao lưu. Tùy chọn `-v` xóa volume và toàn bộ dữ liệu PostgreSQL, Redis, RabbitMQ, MinIO.
:::

## 10. Cập nhật phiên bản

Nên sao lưu trước khi cập nhật. Sau đó sửa `IMAGE_TAG` hoặc giữ `latest`, rồi chạy:

```bash
git pull
docker compose pull
docker compose up -d
docker image prune
```

Trong production, nên dùng tag release cố định, ví dụ `v1.2.0`, thay vì `latest` để có thể kiểm soát phiên bản và rollback.

## 11. Sao lưu cơ bản

Sao lưu PostgreSQL:

```bash
docker compose exec -T postgres pg_dumpall \
  -U awe_user > awe-postgres-backup.sql
```

Khôi phục PostgreSQL:

```bash
cat awe-postgres-backup.sql | docker compose exec -T postgres \
  psql -U awe_user
```

Ngoài database, cần sao lưu volume MinIO vì đây là nơi lưu plugin package. Với production, nên dùng công cụ backup volume phù hợp với hạ tầng đang vận hành và kiểm tra khôi phục định kỳ.

## 12. Xử lý sự cố

### Không pull được AWE image

Kiểm tra `IMAGE_REGISTRY`, `IMAGE_TAG` và quyền truy cập GHCR:

```bash
docker compose config | grep image
docker compose pull
```

Nếu package private, chạy lại `docker login ghcr.io`.

### Worker không kết nối được RabbitMQ

Kiểm tra:

- `RABBITMQ_PORT=5672`, không dùng cổng host `5673`.
- `RABBITMQ_DEFAULT_PASS` và `RABBITMQ_PASSWORD` giống nhau.
- `RABBITMQ_DEFAULT_VHOST` và `RABBITMQ_VHOST` cùng là `awe-system`.
- Container `rabbitmq-setup` đã chạy thành công.

```bash
docker compose logs rabbitmq rabbitmq-setup
docker compose logs worker-engine worker
```

### Đăng nhập xong bị chuyển hướng lỗi

Kiểm tra đồng thời:

- `OIDC_AUTHORITY` dùng URL mà trình duyệt truy cập được.
- Redirect URI trong `.env` khớp cấu hình client `awe-fe`.
- Web origin trong Keycloak đúng scheme, domain và port.
- Không trộn `http` và `https`.

### Keycloak không import lại realm

Realm chỉ được import khi chưa tồn tại. Nếu PostgreSQL đã có dữ liệu Keycloak, sửa tệp `realm-export.json` rồi restart sẽ không ghi đè realm hiện tại. Hãy thay đổi cấu hình trực tiếp trong Keycloak Admin Console hoặc xóa dữ liệu chỉ khi chắc chắn không cần giữ hệ thống cũ.

### Database không được tạo

`init-dbs.sh` chỉ chạy khi volume PostgreSQL được khởi tạo lần đầu. Xem log:

```bash
docker compose logs postgres
```

Nếu đây là môi trường thử nghiệm và có thể xóa toàn bộ dữ liệu, mới dùng:

```bash
docker compose down -v
docker compose up -d
```

### Kiểm tra nhanh toàn hệ thống

```bash
docker compose ps
docker compose logs --tail=100 api-gateway
docker compose logs --tail=100 worker-engine worker
docker compose logs --tail=100 keycloak rabbitmq postgres
```
