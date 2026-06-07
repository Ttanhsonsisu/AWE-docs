---
sidebar_position: 4
title: Built-in Plugins
description: Tài liệu các plugin mặc định được đăng ký trong AWE.WorkflowEngine.
---

# Built-in Plugins

Built-in plugins nằm trong `AWE.WorkflowEngine.BuiltInPlugins` và được đăng ký trong `AddWorkflowEngineService()`. Chúng có `ExecutionMode = BuiltIn` và xuất hiện trong catalog qua `PluginRegistry`.

## Danh sách tổng quan

| Name | Display name | Category | Trigger | Mô tả |
| --- | --- | --- | --- | --- |
| `ManualTrigger` | Kích Hoạt Bằng Tay | `Trigger` | `Manual` | Khởi đầu workflow bằng lệnh run thủ công. |
| `WebhookTrigger` | Webhook Trigger | `Trigger` | `Webhook` | Khởi đầu workflow từ webhook route. |
| `CronTrigger` | Kích Hoạt Theo Lịch | `Trigger` | `Cron` | Khởi đầu workflow theo cron schedule. |
| `Log` | Ghi Log Hệ Thống | `Core` | Không | Ghi message ra log worker. |
| `Delay` | Chờ Đợi (Delay) | `Core` | Không | Node delay/hibernate theo thời gian. |
| `Approval` | Phê duyệt (Human Task) | `Human Interaction` | Không | Tạo approval token, gửi thông báo và suspend workflow. |
| `If` | Điều kiện (If/Else) | `Logic` | Không | So sánh điều kiện và trả `IsMatch`. |
| `Join` | Gộp Luồng (Join) | `Logic` | Không | Điểm hội tụ các nhánh song song. |
| `RetryTest` | Retry Test Plugin | `Testing` | Không | Giả lập lỗi để kiểm thử retry. |

## ManualTrigger

| Thuộc tính | Giá trị |
| --- | --- |
| `Name` | `ManualTrigger` |
| `TriggerSource` | `Manual` |
| `IsSingleton` | `false` |
| `InputType` | `null` |
| `OutputType` | `null` |
| Icon | `lucide-mouse-pointer-click` |

`ManualTrigger` nhận payload lúc run workflow và pass-through payload đó thành output. Nếu payload không parse được thành object JSON, plugin bọc giá trị vào `{ "RawInput": "..." }`.

Dùng khi workflow được khởi chạy từ nút **Run Workflow** hoặc API manual submit.

## WebhookTrigger

| Thuộc tính | Giá trị |
| --- | --- |
| `Name` | `WebhookTrigger` |
| `TriggerSource` | `Webhook` |
| `IsSingleton` | `false` |
| Icon | `lucide-webhook` |

Input schema:

| Field | Type | Mô tả |
| --- | --- | --- |
| `RoutePath` | `string` | Đường dẫn route webhook. |
| `SecretToken` | `string?` | Token/secret dùng cho xác thực webhook nếu có. |
| `IdempotencyKeyPath` | `string?` | JSON path để lấy idempotency key từ payload. |

Khi webhook đến API Gateway, workflow nhận payload webhook và plugin pass-through payload thành output cho node tiếp theo.

## CronTrigger

| Thuộc tính | Giá trị |
| --- | --- |
| `Name` | `CronTrigger` |
| `TriggerSource` | `Cron` |
| `IsSingleton` | `true` |
| Icon | `lucide-calendar-clock` |

Input schema:

| Field | Type | Default | Mô tả |
| --- | --- | --- | --- |
| `CronExpression` | `string` | `* * * * *` | Biểu thức cron. |
| `TimeZoneId` | `string?` | `null` | Múi giờ lịch chạy. UI lấy option từ `/dropdown/timezones`. |

`CronTrigger` được đồng bộ vào scheduler khi workflow publish. `IsSingleton = true` nghĩa là mỗi workflow nên chỉ có một cron trigger.

## Log

| Thuộc tính | Giá trị |
| --- | --- |
| `Name` | `Log` |
| Category | `Core` |
| Icon | `lucide-terminal` |

Input schema:

| Field | Type | Mô tả |
| --- | --- | --- |
| `Msg` | `string?` | Nội dung cần ghi log. Nếu rỗng, mặc định `No message`. |

Output schema:

| Field | Type | Giá trị |
| --- | --- | --- |
| `LogStatus` | `string?` | `Written to Console` |

Plugin dùng `ILogger<LogPlugin>` để ghi log trong worker. `CompensateAsync` chỉ ghi warning và trả success.

## Delay

| Thuộc tính | Giá trị |
| --- | --- |
| `Name` | `Delay` |
| Category | `Core` |
| Icon | `lucide-timer` |

Input schema:

| Field | Type | Default | Mô tả |
| --- | --- | --- | --- |
| `Seconds` | `int` | `60` | Số giây cần chờ. |

Source plugin hiện tại trả success ngay trong `ExecuteAsync`; hành vi delay/hibernate thực tế được engine/background service xử lý theo pointer/scheduler. Khi dùng node này, cần đảm bảo runtime delay wake-up đã được cấu hình đúng trong engine.

## Approval

| Thuộc tính | Giá trị |
| --- | --- |
| `Name` | `Approval` |
| Category | `Human Interaction` |
| Icon | `UserCheck` |

Input schema:

| Field | Type | Mô tả |
| --- | --- | --- |
| `Channels` | `List<string>?` | Kênh gửi thông báo, hiện tại code kiểm tra `Email` và `Telegram`. |
| `ApproverEmail` | `string?` | Email người phê duyệt. |
| `TelegramChatId` | `string?` | Chat ID Telegram. |
| `Title` | `string?` | Tiêu đề yêu cầu phê duyệt. |
| `Message` | `string?` | Nội dung yêu cầu phê duyệt. |

Output schema:

| Field | Type | Mô tả |
| --- | --- | --- |
| `IsApproved` | `bool` | Kết quả phê duyệt sau khi resume. |
| `Reason` | `string?` | Lý do từ chối/ghi chú. |
| `ApproverName` | `string?` | Tên người phê duyệt. |

Lưu ý runtime:

- Engine phải chèn `PointerId` vào payload trước khi gọi plugin.
- Plugin tạo `ApprovalToken` hết hạn sau 3 ngày.
- Plugin trả `PluginResult.Suspend(...)`, workflow sẽ tạm dừng cho đến khi có hành động phê duyệt/resume.
- `CompensateAsync` hết hạn token nếu workflow rollback khi token chưa được dùng.

## If

| Thuộc tính | Giá trị |
| --- | --- |
| `Name` | `If` |
| Category | `Logic` |
| Icon | `lucide-git-branch` |

Input schema:

| Field | Type | Toán tử |
| --- | --- | --- |
| `Value1` | `string?` | Giá trị bên trái. |
| `Operator` | `string?` | Hỗ trợ `==`, `!=`, `contains`. |
| `Value2` | `string?` | Giá trị bên phải. |

Output schema:

| Field | Type | Mô tả |
| --- | --- | --- |
| `IsMatch` | `bool` | Kết quả so sánh. |

So sánh string không phân biệt hoa thường với `==` và `!=`. Toán tử không hỗ trợ sẽ trả `false`.

## Join

| Thuộc tính | Giá trị |
| --- | --- |
| `Name` | `Join` |
| Category | `Logic` |
| Icon | `lucide-git-merge` |

`Join` là điểm hội tụ các nhánh song song. Logic barrier thực tế nằm trong engine/repository join barrier; plugin chỉ pass-through và trả output:

```json
{
  "Message": "Barrier broken. All branches joined successfully!"
}
```

## RetryTest

| Thuộc tính | Giá trị |
| --- | --- |
| `Name` | `RetryTest` |
| Category | `Testing` |
| Icon | `lucide-rotate-cw` |

Input schema:

| Field | Type | Default | Mô tả |
| --- | --- | --- | --- |
| `FailTimes` | `int` | `1` | Số lần đầu tiên sẽ throw exception. |
| `ErrorType` | `string` | `Timeout` | `Timeout` để throw `TimeoutException`, `Http` để throw `HttpRequestException`. |
| `Message` | `string?` | `Simulated transient failure` | Nội dung lỗi giả lập. |

Output schema:

| Field | Type | Mô tả |
| --- | --- | --- |
| `Attempt` | `int` | Số lần execute tại thời điểm thành công. |
| `FailTimes` | `int` | Giá trị fail đã cấu hình. |
| `PointerId` | `string` | Pointer đang chạy. |
| `Status` | `string` | `Success` khi vượt qua số lần fail. |

Plugin dùng static attempt map theo `PointerId`. `CompensateAsync` xóa attempt state của pointer.
