---
sidebar_position: 2
title: Hướng dẫn sử dụng
description: Hướng dẫn tạo, cấu hình, publish và chạy workflow trong AWE.
---

# Hướng dẫn sử dụng

Tài liệu này mô tả luồng sử dụng AWE từ góc nhìn người dùng frontend.

## 1. Mở danh sách workflow

Vào màn hình **Workflows** để xem các workflow definition hiện có. Tại đây có thể:

- Tạo workflow mới.
- Mở canvas để chỉnh sửa.
- Publish hoặc unpublish definition.
- Run workflow.
- Clone, import, export hoặc xóa workflow.

## 2. Tạo workflow

1. Chọn **Create Workflow**.
2. Nhập tên workflow.
3. Mở workflow vừa tạo để vào canvas editor.

Canvas sử dụng node-based editor. Mỗi node đại diện cho một plugin trong catalog.

## 3. Thêm node từ plugin catalog

Node library được lấy từ API `GET /api/plugins/catalog` và chia theo category, ví dụ:

- `Trigger`
- `Core`
- `Logic`
- `Human Interaction`
- `Testing`
- custom categories từ Dynamic DLL plugins

Khi kéo plugin vào canvas, FE lưu các metadata quan trọng vào node:

| Metadata | Ý nghĩa |
| --- | --- |
| `name` | Tên kỹ thuật của plugin, phải khớp `IWorkflowPlugin.Name`. |
| `displayName` | Tên hiển thị trên UI. |
| `category` | Nhóm plugin. |
| `executionMode` | `BuiltIn`, `DynamicDll` hoặc `RemoteGrpc`. |
| `packageId` | Có giá trị với custom package, `null` với built-in. |
| `version` | Version active của plugin package. |
| `inputSchema` | JSON Schema để render form cấu hình input. |
| `outputSchema` | JSON Schema để mapping output. |
| `triggerSource` | Áp dụng cho trigger plugin. |
| `isSingleton` | Trigger có được phép lặp lại trong workflow hay không. |

## 4. Cấu hình node

Click node để mở panel cấu hình.

### Thông tin chung

| Trường | Mô tả |
| --- | --- |
| Step ID | Định danh bước trong definition. Nên ngắn gọn, không chứa khoảng trắng. |
| Tên hiển thị | Label hiện trên canvas và log. |

### Tham số đầu vào

FE render form từ `inputSchema` bằng React JSON Schema Form. Backend sinh schema từ `InputType` của plugin.

Các kiểu field thường gặp:

| C# type | UI mặc định |
| --- | --- |
| `string` | Text input hoặc textarea nếu field dài. |
| `int`, `double`, `decimal` | Number input. |
| `bool` | Switch. |
| `enum` | Select. |
| `List<T>` | Array editor. |
| object class | Nested object group. |

Plugin có thể thêm metadata UI bằng `[UiField]`, ví dụ:

```csharp
[UiField(
    Widget = "select",
    Label = "Múi giờ",
    DataSourceUrl = "/dropdown/timezones"
)]
public string? TimeZoneId { get; set; }
```

FE đọc các extension `x-*` sau:

| Extension | Tác dụng |
| --- | --- |
| `x-widget` | Chọn widget, hiện có hỗ trợ `select`, `textarea` và dynamic select. |
| `x-label` | Đổi label field trên form. |
| `x-data-source-url` | Gọi API dropdown để nạp option. |
| `x-show-if` | Metadata điều kiện hiển thị, để mở rộng UI conditional. |
| `x-group` | Metadata nhóm field. |

### Cấu hình retry

Trong panel nâng cao, bật retry và nhập `MaxRetries` nếu node có thể gặp lỗi tạm thời. Khi plugin throw exception hoặc trả failure, engine có thể retry theo số lần đã cấu hình.

## 5. Kết nối node

Nối edge từ source node sang target node. Backend lưu các edge này thành `Transitions`.

Transition cơ bản:

```json
{
  "Source": "start",
  "Target": "send_log"
}
```

Với node `If`, output `IsMatch` được dùng để rẽ nhánh theo điều kiện. Phần transition evaluator của engine quyết định nhánh nào được đi tiếp theo definition.

## 6. Publish workflow

Sau khi cấu hình node và transitions, publish workflow để đưa definition vào trạng thái có thể chạy.

Khi publish, các trigger đặc biệt có thể được đồng bộ:

- `CronTrigger`: tạo/cập nhật lịch Quartz.
- `WebhookTrigger`: tạo/cập nhật route webhook.

## 7. Run workflow thủ công

Với workflow bắt đầu bằng `ManualTrigger`, chọn **Run Workflow** từ danh sách workflow.

Payload khởi chạy được truyền vào trigger. `ManualTrigger` pass-through payload này thành output của bước đầu tiên, để các bước sau có thể sử dụng.

Ví dụ payload:

```json
{
  "customerName": "Nguyễn Văn A",
  "orderId": "ORD-001"
}
```

## 8. Theo dõi execution

Sau khi run, FE chuyển sang execution mode và lắng nghe realtime update. Người dùng có thể xem:

- Trạng thái workflow instance.
- Log từng node.
- Input/output của pointer.
- Lỗi và retry attempt.
- Trạng thái suspended với approval/delay.

## 9. Quản lý plugin package

Vào màn hình **Plugins** để:

- Xem built-in plugins và custom packages.
- Tạo package mới cho custom plugin.
- Upload version `.dll`.
- Activate/deactivate version.
- Xem detail schema input/output.

Built-in plugins không có `packageId`, không upload version và không toggle enable theo package.
