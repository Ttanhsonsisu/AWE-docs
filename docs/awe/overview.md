---
sidebar_position: 1
title: Tổng quan AWE
description: Tổng quan về Automation Workflow Engine, plugin catalog và cách frontend làm việc với backend.
---

# Tổng quan AWE

AWE (Automation Workflow Engine) là nền tảng thiết kế và chạy workflow theo mô hình node-based. Mỗi node trên canvas tương ứng với một plugin. Workflow được tạo trên frontend, lưu thành definition, sau đó backend engine điều phối từng bước thực thi theo transition.

## Các thành phần chính

| Thành phần | Vai trò |
| --- | --- |
| FE | Giao diện quản lý workflow, canvas kéo-thả node, cấu hình input bằng JSON Schema và quản lý plugin package. |
| AWE.ApiGateway | API cho workflow, execution, approval, webhook và plugin management. |
| AWE.WorkflowEngine | Runtime điều phối workflow, đăng ký built-in plugins, scheduler, recovery, join barrier, compensation và signal realtime. |
| AWE.Sdk | Contract để implement plugin, gồm `IWorkflowPlugin`, `ITriggerPlugin`, `PluginContext`, `PluginResult` và `WorkflowPluginBase`. |
| AWE.Infrastructure | Persistence, MinIO storage, plugin upload/validation/loading và repository implementation. |
| Worker | Xử lý message từ queue và gọi engine/plugin theo lệnh dispatch. |

## Plugin trong AWE

AWE hỗ trợ 3 execution mode:

| Mode | Giá trị enum | Mô tả |
| --- | ---: | --- |
| `BuiltIn` | `0` | Plugin được đăng ký sẵn trong `AWE.WorkflowEngine`. Không cần upload DLL. |
| `DynamicDll` | `1` | Plugin bên ngoài build thành `.dll`, upload vào package, validate schema, lưu version và load lúc runtime. |
| `RemoteGrpc` | `2` | Dự phòng cho plugin chạy ngoài process qua gRPC. Source hiện tại mới khai báo enum và FE type, chưa có runtime hoàn chỉnh. |

Frontend lấy danh sách plugin qua `GET /api/plugins/catalog`. Backend gom built-in plugins từ `PluginRegistry` và custom package đang active, trả về theo category. Mỗi plugin trả về metadata, input schema, output schema, trigger source và thông tin singleton nếu là trigger.

## Vòng đời workflow

1. Người dùng tạo workflow trên FE.
2. FE lấy plugin catalog, hiển thị node library theo category.
3. Khi thêm node, FE lưu metadata của plugin vào node data.
4. Khi cấu hình node, FE dùng `inputSchema` để render form bằng React JSON Schema Form.
5. Khi publish/import/update workflow, backend lưu `DefinitionJson`.
6. Khi run workflow, engine tạo workflow instance và execution pointer.
7. Worker nhận job, engine resolve input, chạy plugin, ghi log, dispatch node tiếp theo.
8. Nếu plugin trả `PluginResult.Suspend(...)`, pointer tạm dừng để chờ approval/delay/resume.
9. Nếu plugin lỗi và có retry, engine thử lại theo cấu hình `MaxRetries`; nếu workflow cần rollback, engine gọi `CompensateAsync`.

## Định dạng definition cơ bản

Definition runtime làm việc với `Steps` và `Transitions`.

```json
{
  "Steps": [
    {
      "Id": "start",
      "Type": "ManualTrigger",
      "DisplayName": "Start",
      "ExecutionMode": "BuiltIn",
      "Inputs": {}
    },
    {
      "Id": "log_result",
      "Type": "Log",
      "DisplayName": "Log Result",
      "ExecutionMode": "BuiltIn",
      "Inputs": {
        "Msg": "Workflow started"
      },
      "MaxRetries": 3
    }
  ],
  "Transitions": [
    {
      "Source": "start",
      "Target": "log_result"
    }
  ]
}
```

FE có thể hydrate definition thiếu `UiJson` thành node/edge React Flow bằng catalog hiện tại. Trường `Type` phải khớp với `IWorkflowPlugin.Name`.

## Input, output và expression

Input node được lưu trong `Inputs`. Engine resolve biến trước khi gọi plugin, vì vậy plugin nên đọc input đã resolve qua `PluginContext.Get<T>("FieldName")` hoặc deserialize payload thành input class.

Output của plugin được trả qua `PluginResult.Success(outputs)`. Các bước sau có thể tham chiếu output của bước trước thông qua cơ chế mapping/expression trên FE và resolver của engine.

## Realtime và monitoring

Runtime ghi execution log, status pointer và workflow instance. FE có các panel execution/log và SignalR hook để cập nhật trạng thái node khi workflow đang chạy.
