---
sidebar_position: 4
title: Implement plugin bằng AWE.Sdk
description: Hướng dẫn tạo, build, validate và upload Dynamic DLL plugin bằng AWE.Sdk.v2.
---

# Implement plugin bằng AWE.Sdk

AWE.Sdk là contract giữa engine và plugin. Source hiện tại sử dụng namespace `AWE.Sdk.v2`; các file `AWE.Sdk/IWorkflowPlugin.cs`, `PluginContext.cs`, `PluginResult.cs` ở root đang bị comment và không phải API chính.

## Yêu cầu project plugin

Plugin nên là project `.NET` class library target `net10.0`, tham chiếu `AWE.Sdk`.

```xml title="MyPlugin.csproj"
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\Core\AWE.Sdk\AWE.Sdk.csproj" />
  </ItemGroup>
</Project>
```

Nếu plugin nằm ngoài solution, có thể tham chiếu đến DLL/NuGet SDK từ pipeline phát hành nội bộ. Quan trọng là assembly runtime phải load được cùng contract `AWE.Sdk.v2.IWorkflowPlugin`.

## Contract `IWorkflowPlugin`

```csharp
using AWE.Sdk.v2;

public interface IWorkflowPlugin
{
    string Name { get; }
    string DisplayName { get; }
    string Description { get; }
    string Category { get; }
    string Icon { get; }

    Type? InputType { get; }
    Type? OutputType { get; }

    Task<PluginResult> ExecuteAsync(PluginContext context);
    Task<PluginResult> CompensateAsync(PluginContext context);
}
```

| Member | Bắt buộc | Mô tả |
| --- | --- | --- |
| `Name` | Có | Định danh kỹ thuật. Phải ổn định giữa các version nếu workflow đang dùng plugin này. |
| `DisplayName` | Có | Tên hiển thị trên FE. |
| `Description` | Có | Mô tả ngắn cho catalog/node library. |
| `Category` | Có | Nhóm plugin trên FE, ví dụ `Data Manipulation`, `Integration`, `API`. |
| `Icon` | Có | Tên icon Lucide, ví dụ `lucide-type`, `lucide-send`, `lucide-box`. |
| `InputType` | Khuyên dùng | Class input để backend sinh JSON Schema. Trả `null` nếu input động. |
| `OutputType` | Khuyên dùng | Class output để backend sinh JSON Schema. Trả `null` nếu không có output có cấu trúc. |
| `ExecuteAsync` | Có | Logic chính của plugin. |
| `CompensateAsync` | Có | Logic rollback/cleanup. Trả success nếu không có gì để rollback. |

## `PluginContext`

`PluginContext` gồm:

| Member | Mô tả |
| --- | --- |
| `Payload` | Chuỗi JSON gốc được engine truyền vào plugin. |
| `Root` | `JsonElement` root đã clone. |
| `CancellationToken` | Token hủy từ runtime. |
| `Get<T>(key)` | Lấy field theo tên, không phân biệt hoa thường. Nếu deserialize lỗi, trả default. |
| `GetRaw(key)` | Lấy `JsonElement` raw. |

Ví dụ:

```csharp
var text = context.Get<string>("Text");
var count = context.Get<int?>("Count") ?? 0;
```

## `PluginResult`

Plugin trả kết quả qua factory method:

```csharp
return PluginResult.Success(new { Result = "OK" });
return PluginResult.Failure("Input Text is required.");
return PluginResult.Suspend("Đang chờ phê duyệt...");
```

| Kết quả | Engine hiểu là |
| --- | --- |
| `Success(outputs)` | Node thành công, lưu output và dispatch transition tiếp theo. |
| `Failure(message)` | Node lỗi, runtime có thể retry hoặc mark failed. |
| `Suspend(message)` | Node tạm dừng. Workflow chờ event/resume bên ngoài. |

## Cách 1: Implement trực tiếp `IWorkflowPlugin`

```csharp title="TextProcessorPlugin.cs"
using System.Text.Json.Serialization;
using AWE.Sdk.v2;

namespace AWE.Plugins.Samples;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TextOperation
{
    UPPER,
    LOWER,
    REVERSE
}

public class TextProcessorInput
{
    public string? Text { get; set; }
    public TextOperation? Operation { get; set; }
}

public class TextProcessorOutput
{
    public string? Result { get; set; }
    public int OriginalLength { get; set; }
}

public class TextProcessorPlugin : IWorkflowPlugin
{
    public string Name => "AWE.Samples.TextProcessor";
    public string DisplayName => "Xử lý Văn bản";
    public string Description => "Biến đổi chuỗi đầu vào.";
    public string Category => "Data Manipulation";
    public string Icon => "lucide-type";

    public Type? InputType => typeof(TextProcessorInput);
    public Type? OutputType => typeof(TextProcessorOutput);

    public Task<PluginResult> ExecuteAsync(PluginContext context)
    {
        var text = context.Get<string>("Text");
        var operation = context.Get<string>("Operation") ?? "UPPER";

        if (string.IsNullOrWhiteSpace(text))
        {
            return Task.FromResult(PluginResult.Failure("Text is required."));
        }

        var result = operation.ToUpperInvariant() switch
        {
            "LOWER" => text.ToLowerInvariant(),
            "REVERSE" => new string(text.Reverse().ToArray()),
            _ => text.ToUpperInvariant()
        };

        return Task.FromResult(PluginResult.Success(new TextProcessorOutput
        {
            Result = result,
            OriginalLength = text.Length
        }));
    }

    public Task<PluginResult> CompensateAsync(PluginContext context)
        => Task.FromResult(PluginResult.Success());
}
```

Cách này linh hoạt nhất. Bạn tự đọc `PluginContext` và tự validate input.

## Cách 2: Kế thừa `WorkflowPluginBase<TInput, TOutput>`

`WorkflowPluginBase` tự deserialize `context.Payload` thành `TInput`, chạy DataAnnotations validation và gọi `ExecuteLogicAsync`.

```csharp title="SendTelegramPlugin.cs"
using System.ComponentModel.DataAnnotations;
using AWE.Sdk.v2;
using AWE.Sdk.v2.Attributes;

public class SendTelegramInput
{
    [Required]
    [UiField(Label = "Telegram Chat ID")]
    public string ChatId { get; set; } = string.Empty;

    [Required]
    [UiField(Widget = "textarea", Label = "Message")]
    public string Message { get; set; } = string.Empty;
}

public class SendTelegramOutput
{
    public string Status { get; set; } = "Sent";
}

public class SendTelegramPlugin : WorkflowPluginBase<SendTelegramInput, SendTelegramOutput>
{
    public override string Name => "AWE.Integration.SendTelegram";
    public override string DisplayName => "Send Telegram";
    public override string Description => "Gửi tin nhắn Telegram.";
    public override string Category => "Integration";
    public override string Icon => "lucide-send";

    protected override Task<SendTelegramOutput> ExecuteLogicAsync(
        SendTelegramInput input,
        CancellationToken ct)
    {
        // Gọi API Telegram tại đây.
        return Task.FromResult(new SendTelegramOutput { Status = "Sent" });
    }
}
```

Cách này phù hợp với plugin input/output có cấu trúc rõ ràng. Lỗi parse JSON, lỗi validation và exception trong logic sẽ được convert thành `PluginResult.Failure(...)`.

## Tạo schema cho FE

Backend dùng `PluginSchemaGenerator.GenerateSchema(InputType)` và `OutputType` để tạo JSON Schema OpenAPI 3. FE dùng schema này để render form.

Nên làm:

- Đặt property PascalCase rõ ràng, vì FE và `PluginContext.Get<T>` hỗ trợ case-insensitive.
- Dùng nullable reference type để thể hiện field có thể rỗng.
- Dùng DataAnnotations như `[Required]`, `[Range]`, `[StringLength]` nếu dùng `WorkflowPluginBase`.
- Dùng enum cho select có danh sách cố định.
- Dùng `[UiField]` khi cần widget đặc biệt.

Ví dụ input có dropdown động:

```csharp
using AWE.Sdk.v2.Attributes;

public class CronLikeInput
{
    public string CronExpression { get; set; } = "0 * * * *";

    [UiField(
        Widget = "select",
        Label = "Múi giờ",
        DataSourceUrl = "/dropdown/timezones"
    )]
    public string? TimeZoneId { get; set; }
}
```

## Build plugin DLL

Build release:

```powershell
dotnet build .\MyPlugin.csproj -c Release
```

DLL output thường nằm tại:

```text
bin/Release/net10.0/MyPlugin.dll
```

Chỉ upload DLL plugin chính. Nếu plugin có dependency riêng, runtime hiện tại cần đảm bảo dependency đó load được bởi `PluginLoadContext`. Nên hạn chế dependency ngoài hoặc đóng gói/phát hành theo chuẩn loader của hệ thống.

## Validate và upload

Quy trình trên UI:

1. Vào **Plugins**.
2. Tạo package với `ExecutionMode = DynamicDll`.
3. Upload version mới, chọn file `.dll`.
4. Backend validate assembly:
   - File phải là .NET assembly hợp lệ.
   - Phải có class concrete implement `AWE.Sdk.v2.IWorkflowPlugin`.
   - Validator trích metadata `Name`, `DisplayName`, `Description`, `Category`, `Icon`.
   - Validator sinh `InputSchema` và `OutputSchema`.
5. Backend tính SHA256, upload DLL lên storage, lưu `ExecutionMetadata`.
6. Activate version để catalog có thể sử dụng.

API tương ứng:

```http
POST /api/plugins/packages
Content-Type: application/json

{
  "uniqueName": "AWE.Samples.TextProcessor",
  "displayName": "Text Processor",
  "executionMode": 1,
  "category": "Data Manipulation",
  "icon": "lucide-type",
  "description": "Text utility plugin"
}
```

```http
POST /api/plugins/packages/{packageId}/versions
Content-Type: multipart/form-data

Version=1.0.0
Bucket=awe-plugins
ReleaseNotes=Initial version
File=@MyPlugin.dll
```

```http
POST /api/plugins/versions/{versionId}/activate
```

## Runtime load custom plugin

Khi Dynamic DLL node chạy:

1. Engine lấy active version và execution metadata.
2. Loader tải DLL về temp path.
3. Tạo `PluginLoadContext` riêng.
4. Tìm class implement `IWorkflowPlugin`.
5. Tạo instance bằng `ActivatorUtilities.CreateInstance(...)`, vì vậy constructor có thể nhận service từ DI nếu service đó đã được đăng ký trong host.
6. Tạo `PluginContext(payload, ct)`.
7. Gọi `ExecuteAsync` hoặc `CompensateAsync`.
8. Unload context, xóa temp file và gọi GC để giảm memory leak.

## Best practices

- Giữ `Name` bất biến sau khi workflow đã được publish.
- Version breaking change nên upload version mới, không thay thế DLL cũ.
- Không lưu mutable static state nếu không bắt buộc; nếu có, clear trong `CompensateAsync`.
- Tôn trọng `CancellationToken`.
- Không throw cho lỗi validation dữ liệu người dùng; trả `PluginResult.Failure(...)`.
- Chỉ throw cho lỗi bất thường mà runtime retry có thể xử lý.
- Output nên là object có schema rõ ràng để FE mapping dễ hơn.
- `CompensateAsync` nên idempotent: gọi nhiều lần không gây lỗi.

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| `Missing IWorkflowPlugin implementation in DLL` | DLL không có class implement `AWE.Sdk.v2.IWorkflowPlugin` hoặc tham chiếu sai SDK. | Kiểm tra namespace `AWE.Sdk.v2` và build lại. |
| `Not a valid .NET assembly` | Upload sai file hoặc target/runtime không tương thích. | Upload DLL build từ project .NET hợp lệ target `net10.0`. |
| Schema rỗng `{}` | `InputType`/`OutputType` trả `null`. | Trả về `typeof(MyInput)` và `typeof(MyOutput)`. |
| FE không hiện icon mong muốn | Icon string không có trong mapping FE. | Dùng icon Lucide đã map như `lucide-type`, `lucide-send`, `lucide-box`, hoặc thêm mapping FE. |
| Constructor plugin lỗi | Service trong constructor chưa đăng ký DI. | Đăng ký service trong host hoặc bỏ dependency khỏi constructor. |
