---
sidebar_position: 1
title: Tong quan AWE
description: Tong quan ve Automation Workflow Engine, plugin catalog va cach frontend lam viec voi backend.
---

# Tong quan AWE

AWE (Automation Workflow Engine) la nen tang thiet ke va chay workflow theo mo hinh node-based. Moi node tren canvas tuong ung voi mot plugin. Workflow duoc tao tren frontend, luu thanh definition, sau do backend engine dieu phoi tung buoc thuc thi theo transition.

## Cac thanh phan chinh

| Thanh phan | Vai tro |
| --- | --- |
| FE | Giao dien quan ly workflow, canvas keo-tha node, cau hinh input bang JSON Schema va quan ly plugin package. |
| AWE.ApiGateway | API cho workflow, execution, approval, webhook va plugin management. |
| AWE.WorkflowEngine | Runtime dieu phoi workflow, dang ky built-in plugins, scheduler, recovery, join barrier, compensation va signal realtime. |
| AWE.Sdk | Contract de implement plugin, gom `IWorkflowPlugin`, `ITriggerPlugin`, `PluginContext`, `PluginResult` va `WorkflowPluginBase`. |
| AWE.Infrastructure | Persistence, MinIO storage, plugin upload/validation/loading va repository implementation. |
| Worker | Xu ly message tu queue va goi engine/plugin theo lenh dispatch. |

## Plugin trong AWE

AWE ho tro 3 execution mode:

| Mode | Gia tri enum | Mo ta |
| --- | ---: | --- |
| `BuiltIn` | `0` | Plugin duoc dang ky san trong `AWE.WorkflowEngine`. Khong can upload DLL. |
| `DynamicDll` | `1` | Plugin ben ngoai build thanh `.dll`, upload vao package, validate schema, luu version va load luc runtime. |
| `RemoteGrpc` | `2` | Du phong cho plugin chay ngoai process qua gRPC. Source hien tai moi khai bao enum va FE type, chua co runtime hoan chinh. |

Frontend lay danh sach plugin qua `GET /api/plugins/catalog`. Backend gom built-in plugins tu `PluginRegistry` va custom package dang active, tra ve theo category. Moi plugin tra ve metadata, input schema, output schema, trigger source va thong tin singleton neu la trigger.

## Vong doi workflow

1. Nguoi dung tao workflow tren FE.
2. FE lay plugin catalog, hien thi node library theo category.
3. Khi them node, FE luu metadata cua plugin vao node data.
4. Khi cau hinh node, FE dung `inputSchema` de render form bang React JSON Schema Form.
5. Khi publish/import/update workflow, backend luu `DefinitionJson`.
6. Khi run workflow, engine tao workflow instance va execution pointer.
7. Worker nhan job, engine resolve input, chay plugin, ghi log, dispatch node tiep theo.
8. Neu plugin tra `PluginResult.Suspend(...)`, pointer tam dung de cho approval/delay/resume.
9. Neu plugin loi va co retry, engine thu lai theo cau hinh `MaxRetries`; neu workflow can rollback, engine goi `CompensateAsync`.

## Dinh dang definition co ban

Definition runtime lam viec voi `Steps` va `Transitions`.

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

FE co the hydrate definition thieu `UiJson` thanh node/edge React Flow bang catalog hien tai. Truong `Type` phai khop voi `IWorkflowPlugin.Name`.

## Input, output va expression

Input node duoc luu trong `Inputs`. Engine resolve bien truoc khi goi plugin, vi vay plugin nen doc input da resolve qua `PluginContext.Get<T>("FieldName")` hoac deserialize payload thanh input class.

Output cua plugin duoc tra qua `PluginResult.Success(outputs)`. Cac buoc sau co the tham chieu output cua buoc truoc thong qua co che mapping/expression tren FE va resolver cua engine.

## Realtime va monitoring

Runtime ghi execution log, status pointer va workflow instance. FE co cac panel execution/log va SignalR hook de cap nhat trang thai node khi workflow dang chay.
