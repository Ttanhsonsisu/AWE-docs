---
sidebar_position: 2
title: Huong dan su dung
description: Huong dan tao, cau hinh, publish va chay workflow trong AWE.
---

# Huong dan su dung

Tai lieu nay mo ta luong su dung AWE tu goc nhin nguoi dung frontend.

## 1. Mo danh sach workflow

Vao man hinh **Workflows** de xem cac workflow definition hien co. Tai day co the:

- Tao workflow moi.
- Mo canvas de chinh sua.
- Publish hoac unpublish definition.
- Run workflow.
- Clone, import, export hoac xoa workflow.

## 2. Tao workflow

1. Chon **Create Workflow**.
2. Nhap ten workflow.
3. Mo workflow vua tao de vao canvas editor.

Canvas su dung node-based editor. Moi node dai dien cho mot plugin trong catalog.

## 3. Them node tu plugin catalog

Node library duoc lay tu API `GET /api/plugins/catalog` va chia theo category, vi du:

- `Trigger`
- `Core`
- `Logic`
- `Human Interaction`
- `Testing`
- custom categories tu Dynamic DLL plugins

Khi keo plugin vao canvas, FE luu cac metadata quan trong vao node:

| Metadata | Y nghia |
| --- | --- |
| `name` | Ten ky thuat cua plugin, phai khop `IWorkflowPlugin.Name`. |
| `displayName` | Ten hien thi tren UI. |
| `category` | Nhom plugin. |
| `executionMode` | `BuiltIn`, `DynamicDll` hoac `RemoteGrpc`. |
| `packageId` | Co gia tri voi custom package, `null` voi built-in. |
| `version` | Version active cua plugin package. |
| `inputSchema` | JSON Schema de render form cau hinh input. |
| `outputSchema` | JSON Schema de mapping output. |
| `triggerSource` | Ap dung cho trigger plugin. |
| `isSingleton` | Trigger co duoc phep lap lai trong workflow hay khong. |

## 4. Cau hinh node

Click node de mo panel cau hinh.

### Thong tin chung

| Truong | Mo ta |
| --- | --- |
| Step ID | Dinh danh buoc trong definition. Nen ngan gon, khong chua khoang trang. |
| Ten hien thi | Label hien tren canvas va log. |

### Tham so dau vao

FE render form tu `inputSchema` bang React JSON Schema Form. Backend sinh schema tu `InputType` cua plugin.

Cac kieu field thuong gap:

| C# type | UI mac dinh |
| --- | --- |
| `string` | Text input hoac textarea neu field dai. |
| `int`, `double`, `decimal` | Number input. |
| `bool` | Switch. |
| `enum` | Select. |
| `List<T>` | Array editor. |
| object class | Nested object group. |

Plugin co the them metadata UI bang `[UiField]`, vi du:

```csharp
[UiField(
    Widget = "select",
    Label = "Mui gio",
    DataSourceUrl = "/dropdown/timezones"
)]
public string? TimeZoneId { get; set; }
```

FE doc cac extension `x-*` sau:

| Extension | Tac dung |
| --- | --- |
| `x-widget` | Chon widget, hien co ho tro `select`, `textarea` va dynamic select. |
| `x-label` | Doi label field tren form. |
| `x-data-source-url` | Goi API dropdown de nap option. |
| `x-show-if` | Metadata dieu kien hien thi, de mo rong UI conditional. |
| `x-group` | Metadata nhom field. |

### Cau hinh retry

Trong panel nang cao, bat retry va nhap `MaxRetries` neu node co the gap loi tam thoi. Khi plugin throw exception hoac tra failure, engine co the retry theo so lan da cau hinh.

## 5. Ket noi node

Noi edge tu source node sang target node. Backend luu cac edge nay thanh `Transitions`.

Transition co ban:

```json
{
  "Source": "start",
  "Target": "send_log"
}
```

Voi node `If`, output `IsMatch` duoc dung de ranh nhanh theo dieu kien. Phan transition evaluator cua engine quyet dinh nhanh nao duoc di tiep theo definition.

## 6. Publish workflow

Sau khi cau hinh node va transitions, publish workflow de dua definition vao trang thai co the chay.

Khi publish, cac trigger dac biet co the duoc dong bo:

- `CronTrigger`: tao/cap nhat lich Quartz.
- `WebhookTrigger`: tao/cap nhat route webhook.

## 7. Run workflow thu cong

Voi workflow bat dau bang `ManualTrigger`, chon **Run Workflow** tu danh sach workflow.

Payload khoi chay duoc truyen vao trigger. `ManualTrigger` pass-through payload nay thanh output cua buoc dau tien, de cac buoc sau co the su dung.

Vi du payload:

```json
{
  "customerName": "Nguyen Van A",
  "orderId": "ORD-001"
}
```

## 8. Theo doi execution

Sau khi run, FE chuyen sang execution mode va lang nghe realtime update. Nguoi dung co the xem:

- Trang thai workflow instance.
- Log tung node.
- Input/output cua pointer.
- Loi va retry attempt.
- Trang thai suspended voi approval/delay.

## 9. Quan ly plugin package

Vao man hinh **Plugins** de:

- Xem built-in plugins va custom packages.
- Tao package moi cho custom plugin.
- Upload version `.dll`.
- Activate/deactivate version.
- Xem detail schema input/output.

Built-in plugins khong co `packageId`, khong upload version va khong toggle enable theo package.
