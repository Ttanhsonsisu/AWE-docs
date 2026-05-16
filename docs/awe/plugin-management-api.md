---
sidebar_position: 5
title: Plugin Management API
description: API quan ly catalog, package, version va detail schema plugin.
---

# Plugin Management API

API plugin nam duoi prefix `/api/plugins` va yeu cau policy editor. FE hien tai goi qua `apiClient` voi path ngan `/plugins/...`, vi base URL da gan prefix `/api`.

## Catalog

```http
GET /api/plugins/catalog
```

Tra danh sach plugin theo category. Bao gom built-in plugins va custom packages co active version.

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
          "displayName": "Ghi Log He Thong",
          "description": "In mot thong bao ra Console cua Worker.",
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

Ket qua gom built-in plugin va custom package trong cung mot list. Built-in item co `id = null`, `latestVersion = null`, `isBuiltIn = true`.

Query:

| Param | Mo ta |
| --- | --- |
| `page` | Trang, mac dinh `1`. |
| `size` | So item moi trang, mac dinh `10`. |
| `search` | Tim theo `displayName` hoac `uniqueName`. |
| `executionMode` | Loc theo enum `BuiltIn`, `DynamicDll`, `RemoteGrpc` hoac gia tri enum tu backend. |
| `category` | Loc category. |

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

`executionMode = 1` la `DynamicDll`. Package `BuiltIn` khong can tao thu cong vi registry tu source code da cung cap.

## Upload version

```http
POST /api/plugins/packages/{packageId}/versions
Content-Type: multipart/form-data
```

Form data:

| Key | Bat buoc | Mo ta |
| --- | --- | --- |
| `Version` | Co | Version string, vi du `1.0.0`. |
| `Bucket` | Khong | Bucket storage, mac dinh `awe-plugins`. |
| `ReleaseNotes` | Khong | Ghi chu version. |
| `File` | Co | DLL file. |

Backend se:

1. Kiem tra package ton tai va co `ExecutionMode = DynamicDll`.
2. Validate DLL bang `PluginValidator`.
3. Trich metadata va schema.
4. Cap nhat metadata package theo plugin.
5. Tinh SHA256.
6. Upload object vao storage voi key `plugins/{uniqueName}/{sha256}.dll`.
7. Luu `PluginVersion` voi `ExecutionMetadata`.

Execution metadata mau:

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

Tra cac version cua package.

## Activate/deactivate version

```http
POST /api/plugins/versions/{versionId}/activate
POST /api/plugins/versions/{versionId}/deactivate
```

Catalog chi lay custom package co active version. Neu co nhieu active version, service hien tai chon version active moi nhat theo `CreatedAt`.

## Download version

```http
GET /api/plugins/versions/{versionId}/download
```

Tra stream DLL voi content type `application/octet-stream`.

## Delete version

```http
DELETE /api/plugins/versions/{versionId}?deleteObject=true
```

Neu `deleteObject = true`, backend co gang xoa file trong storage truoc khi xoa DB record.

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

FE dung detail API khi mo panel cau hinh node, dac biet voi Dynamic DLL node. Lookup theo SHA256 giup load dung schema cua DLL da duoc compile vao workflow, ngay ca khi active version da thay doi.

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

## Luu y frontend

- `GET /api/plugins/catalog` duoc cache trong plugin store.
- Node library map `icon` string sang Lucide component.
- Node config panel uu tien detail API schema, sau do fallback sang catalog schema da luu trong node metadata.
- Khi doi version Dynamic DLL, FE xoa input hien tai de tranh mismatch schema.
- Dynamic select widget goi URL tu `x-data-source-url`; backend co the tra array truc tiep hoac `{ data: [...] }`.
