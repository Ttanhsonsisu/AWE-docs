---
sidebar_position: 6
title: Plugin Management API
description: API quản lý catalog, package, version và detail schema plugin.
---

# Plugin Management API

API plugin nằm dưới prefix `/api/plugins` và yêu cầu policy editor. FE hiện tại gọi qua `apiClient` với path ngắn `/plugins/...`, vì base URL đã gắn prefix `/api`.

## Catalog

```http
GET /api/plugins/catalog
```

Trả danh sách plugin theo category. Bao gồm built-in plugins và custom packages có active version.

Response shape:

```json
{
  "success": true,
  "data": [
    {
      "category": "Core",
      "plugins": [
        {
          "packageId": null,
          "activeVersion": "Built-in",
          "name": "Log",
          "displayName": "Ghi Log Hệ Thống",
          "description": "In một thông báo ra Console của Worker.",
          "category": "Core",
          "icon": "lucide-terminal",
          "executionMode": "BuiltIn",
          "inputSchema": {},
          "outputSchema": {},
          "triggerSource": null,
          "isSingleton": false
        }
      ]
    }
  ]
}
```

## List packages

```http
GET /api/plugins/packages?page=1&size=10&search=&executionMode=&category=
```

Kết quả gồm built-in plugin và custom package trong cùng một list. Built-in item có `id = null`, `latestVersion = null`, `isBuiltIn = true`.

Query:

| Param | Mô tả |
| --- | --- |
| `page` | Trang, mặc định `1`. |
| `size` | Số item mỗi trang, mặc định `10`. |
| `search` | Tìm theo `displayName` hoặc `uniqueName`. |
| `executionMode` | Lọc theo enum `BuiltIn`, `DynamicDll`, `RemoteGrpc` hoặc giá trị enum từ backend. |
| `category` | Lọc category. |

## Create package

```http
POST /api/plugins/packages
Content-Type: application/json
```

Body:

```json
{
  "uniqueName": "AWE.Samples.TextProcessor",
  "displayName": "Text Processor",
  "executionMode": 1,
  "category": "Data Manipulation",
  "icon": "lucide-type",
  "description": "Text utility plugin"
}
```

`executionMode = 1` là `DynamicDll`. Package `BuiltIn` không cần tạo thủ công vì registry từ source code đã cung cấp.

## Upload version

```http
POST /api/plugins/packages/{packageId}/versions
Content-Type: multipart/form-data
```

Form data:

| Key | Bắt buộc | Mô tả |
| --- | --- | --- |
| `Version` | Có | Version string, ví dụ `1.0.0`. |
| `Bucket` | Không | Bucket storage, mặc định `awe-plugins`. |
| `ReleaseNotes` | Không | Ghi chú version. |
| `File` | Có | DLL file. |

Backend sẽ:

1. Kiểm tra package tồn tại và có `ExecutionMode = DynamicDll`.
2. Validate DLL bằng `PluginValidator`.
3. Trích metadata và schema.
4. Cập nhật metadata package theo plugin.
5. Tính SHA256.
6. Upload object vào storage với key `plugins/{uniqueName}/{sha256}.dll`.
7. Lưu `PluginVersion` với `ExecutionMetadata`.

Execution metadata mẫu:

```json
{
  "PluginType": "AWE.Samples.TextProcessor",
  "Bucket": "awe-plugins",
  "ObjectKey": "plugins/AWE.Samples.TextProcessor/{sha256}.dll",
  "Sha256": "{sha256}",
  "Size": 15360,
  "OutputSchema": {}
}
```

## List versions

```http
GET /api/plugins/packages/{packageId}/versions
```

Trả các version của package.

## Activate/deactivate version

```http
POST /api/plugins/versions/{versionId}/activate
POST /api/plugins/versions/{versionId}/deactivate
```

Catalog chỉ lấy custom package có active version. Nếu có nhiều active version, service hiện tại chọn version active mới nhất theo `CreatedAt`.

## Download version

```http
GET /api/plugins/versions/{versionId}/download
```

Trả stream DLL với content type `application/octet-stream`.

## Delete version

```http
DELETE /api/plugins/versions/{versionId}?deleteObject=true
```

Nếu `deleteObject = true`, backend cố gắng xóa file trong storage trước khi xóa DB record.

## Get plugin detail

Built-in:

```http
GET /api/plugins/details?mode=BuiltIn&name=Log
```

Dynamic DLL theo package/version:

```http
GET /api/plugins/details?mode=DynamicDll&name=AWE.Samples.TextProcessor&packageId={packageId}&version=1.0.0
```

Dynamic DLL theo SHA256:

```http
GET /api/plugins/details/by-sha256/{sha256}
```

FE dùng detail API khi mở panel cấu hình node, đặc biệt với Dynamic DLL node. Lookup theo SHA256 giúp load đúng schema của DLL đã được compile vào workflow, ngay cả khi active version đã thay đổi.

Response detail:

```json
{
  "success": true,
  "data": {
    "name": "AWE.Samples.TextProcessor",
    "displayName": "Text Processor",
    "executionMode": "DynamicDll",
    "version": "1.0.0",
    "executionMetadata": {},
    "inputSchema": {},
    "outputSchema": {}
  }
}
```

## Lưu ý frontend

- `GET /api/plugins/catalog` được cache trong plugin store.
- Node library map `icon` string sang Lucide component.
- Node config panel ưu tiên detail API schema, sau đó fallback sang catalog schema đã lưu trong node metadata.
- Khi đổi version Dynamic DLL, FE xóa input hiện tại để tránh mismatch schema.
- Dynamic select widget gọi URL từ `x-data-source-url`; backend có thể trả array trực tiếp hoặc `{ data: [...] }`.
