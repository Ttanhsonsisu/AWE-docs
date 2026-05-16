---
sidebar_position: 3
title: Built-in Plugins
description: Tai lieu cac plugin mac dinh duoc dang ky trong AWE.WorkflowEngine.
---

# Built-in Plugins

Built-in plugins nam trong `AWE.WorkflowEngine.BuiltInPlugins` va duoc dang ky trong `AddWorkflowEngineService()`. Chung co `ExecutionMode = BuiltIn` va xuat hien trong catalog qua `PluginRegistry`.

## Danh sach tong quan

| Name | Display name | Category | Trigger | Mo ta |
| --- | --- | --- | --- | --- |
| `ManualTrigger` | Kich Hoat Bang Tay | `Trigger` | `Manual` | Khoi dau workflow bang lenh run thu cong. |
| `WebhookTrigger` | Webhook Trigger | `Trigger` | `Webhook` | Khoi dau workflow tu webhook route. |
| `CronTrigger` | Kich Hoat Theo Lich | `Trigger` | `Cron` | Khoi dau workflow theo cron schedule. |
| `Log` | Ghi Log He Thong | `Core` | Khong | Ghi message ra log worker. |
| `Delay` | Cho Doi (Delay) | `Core` | Khong | Node delay/hibernate theo thoi gian. |
| `Approval` | Phe duyet (Human Task) | `Human Interaction` | Khong | Tao approval token, gui thong bao va suspend workflow. |
| `If` | Dieu kien (If/Else) | `Logic` | Khong | So sanh dieu kien va tra `IsMatch`. |
| `Join` | Gop Luong (Join) | `Logic` | Khong | Diem hoi tu cac nhanh song song. |
| `RetryTest` | Retry Test Plugin | `Testing` | Khong | Gia lap loi de kiem thu retry. |

## ManualTrigger

| Thuoc tinh | Gia tri |
| --- | --- |
| `Name` | `ManualTrigger` |
| `TriggerSource` | `Manual` |
| `IsSingleton` | `false` |
| `InputType` | `null` |
| `OutputType` | `null` |
| Icon | `lucide-mouse-pointer-click` |

`ManualTrigger` nhan payload luc run workflow va pass-through payload do thanh output. Neu payload khong parse duoc thanh object JSON, plugin boc gia tri vao `{ "RawInput": "..." }`.

Dung khi workflow duoc khoi chay tu nut **Run Workflow** hoac API manual submit.

## WebhookTrigger

| Thuoc tinh | Gia tri |
| --- | --- |
| `Name` | `WebhookTrigger` |
| `TriggerSource` | `Webhook` |
| `IsSingleton` | `false` |
| Icon | `lucide-webhook` |

Input schema:

| Field | Type | Mo ta |
| --- | --- | --- |
| `RoutePath` | `string` | Duong dan route webhook. |
| `SecretToken` | `string?` | Token/secret dung cho xac thuc webhook neu co. |
| `IdempotencyKeyPath` | `string?` | JSON path de lay idempotency key tu payload. |

Khi webhook den API Gateway, workflow nhan payload webhook va plugin pass-through payload thanh output cho node tiep theo.

## CronTrigger

| Thuoc tinh | Gia tri |
| --- | --- |
| `Name` | `CronTrigger` |
| `TriggerSource` | `Cron` |
| `IsSingleton` | `true` |
| Icon | `lucide-calendar-clock` |

Input schema:

| Field | Type | Default | Mo ta |
| --- | --- | --- | --- |
| `CronExpression` | `string` | `* * * * *` | Bieu thuc cron. |
| `TimeZoneId` | `string?` | `null` | Mui gio lich chay. UI lay option tu `/dropdown/timezones`. |

`CronTrigger` duoc dong bo vao scheduler khi workflow publish. `IsSingleton = true` nghia la moi workflow nen chi co mot cron trigger.

## Log

| Thuoc tinh | Gia tri |
| --- | --- |
| `Name` | `Log` |
| Category | `Core` |
| Icon | `lucide-terminal` |

Input schema:

| Field | Type | Mo ta |
| --- | --- | --- |
| `Msg` | `string?` | Noi dung can ghi log. Neu rong, mac dinh `No message`. |

Output schema:

| Field | Type | Gia tri |
| --- | --- | --- |
| `LogStatus` | `string?` | `Written to Console` |

Plugin dung `ILogger<LogPlugin>` de ghi log trong worker. `CompensateAsync` chi ghi warning va tra success.

## Delay

| Thuoc tinh | Gia tri |
| --- | --- |
| `Name` | `Delay` |
| Category | `Core` |
| Icon | `lucide-timer` |

Input schema:

| Field | Type | Default | Mo ta |
| --- | --- | --- | --- |
| `Seconds` | `int` | `60` | So giay can cho. |

Source plugin hien tai tra success ngay trong `ExecuteAsync`; hanh vi delay/hibernate thuc te duoc engine/background service xu ly theo pointer/scheduler. Khi dung node nay, can dam bao runtime delay wake-up da duoc cau hinh dung trong engine.

## Approval

| Thuoc tinh | Gia tri |
| --- | --- |
| `Name` | `Approval` |
| Category | `Human Interaction` |
| Icon | `UserCheck` |

Input schema:

| Field | Type | Mo ta |
| --- | --- | --- |
| `Channels` | `List<string>?` | Kenh gui thong bao, hien tai code kiem tra `Email` va `Telegram`. |
| `ApproverEmail` | `string?` | Email nguoi phe duyet. |
| `TelegramChatId` | `string?` | Chat ID Telegram. |
| `Title` | `string?` | Tieu de yeu cau phe duyet. |
| `Message` | `string?` | Noi dung yeu cau phe duyet. |

Output schema:

| Field | Type | Mo ta |
| --- | --- | --- |
| `IsApproved` | `bool` | Ket qua phe duyet sau khi resume. |
| `Reason` | `string?` | Ly do tu choi/ghi chu. |
| `ApproverName` | `string?` | Ten nguoi phe duyet. |

Luu y runtime:

- Engine phai chen `PointerId` vao payload truoc khi goi plugin.
- Plugin tao `ApprovalToken` het han sau 3 ngay.
- Plugin tra `PluginResult.Suspend(...)`, workflow se tam dung cho den khi co hanh dong phe duyet/resume.
- `CompensateAsync` het han token neu workflow rollback khi token chua duoc dung.

## If

| Thuoc tinh | Gia tri |
| --- | --- |
| `Name` | `If` |
| Category | `Logic` |
| Icon | `lucide-git-branch` |

Input schema:

| Field | Type | Toan tu |
| --- | --- | --- |
| `Value1` | `string?` | Gia tri ben trai. |
| `Operator` | `string?` | Ho tro `==`, `!=`, `contains`. |
| `Value2` | `string?` | Gia tri ben phai. |

Output schema:

| Field | Type | Mo ta |
| --- | --- | --- |
| `IsMatch` | `bool` | Ket qua so sanh. |

So sanh string khong phan biet hoa thuong voi `==` va `!=`. Toan tu khong ho tro se tra `false`.

## Join

| Thuoc tinh | Gia tri |
| --- | --- |
| `Name` | `Join` |
| Category | `Logic` |
| Icon | `lucide-git-merge` |

`Join` la diem hoi tu cac nhanh song song. Logic barrier thuc te nam trong engine/repository join barrier; plugin chi pass-through va tra output:

```json
{
  "Message": "Barrier broken. All branches joined successfully!"
}
```

## RetryTest

| Thuoc tinh | Gia tri |
| --- | --- |
| `Name` | `RetryTest` |
| Category | `Testing` |
| Icon | `lucide-rotate-cw` |

Input schema:

| Field | Type | Default | Mo ta |
| --- | --- | --- | --- |
| `FailTimes` | `int` | `1` | So lan dau tien se throw exception. |
| `ErrorType` | `string` | `Timeout` | `Timeout` de throw `TimeoutException`, `Http` de throw `HttpRequestException`. |
| `Message` | `string?` | `Simulated transient failure` | Noi dung loi gia lap. |

Output schema:

| Field | Type | Mo ta |
| --- | --- | --- |
| `Attempt` | `int` | So lan execute tai thoi diem thanh cong. |
| `FailTimes` | `int` | Gia tri fail da cau hinh. |
| `PointerId` | `string` | Pointer dang chay. |
| `Status` | `string` | `Success` khi vuot qua so lan fail. |

Plugin dung static attempt map theo `PointerId`. `CompensateAsync` xoa attempt state cua pointer.
