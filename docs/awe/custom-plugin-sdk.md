---
sidebar_position: 4
title: Implement plugin bang AWE.Sdk
description: Huong dan tao, build, validate va upload Dynamic DLL plugin bang AWE.Sdk.v2.
---

# Implement plugin bang AWE.Sdk

AWE.Sdk la contract giua engine va plugin. Source hien tai su dung namespace `AWE.Sdk.v2`; cac file `AWE.Sdk/IWorkflowPlugin.cs`, `PluginContext.cs`, `PluginResult.cs` o root dang bi comment va khong phai API chinh.

## Yeu cau project plugin

Plugin nen la project `.NET` class library target `net10.0`, tham chieu `AWE.Sdk`.

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

Neu plugin nam ngoai solution, co the tham chieu den DLL/nuget SDK tu pipeline phat hanh noi bo. Quan trong la assembly runtime phai load duoc cung contract `AWE.Sdk.v2.IWorkflowPlugin`.

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

| Member | Bat buoc | Mo ta |
| --- | --- | --- |
| `Name` | Co | Dinh danh ky thuat. Phai on dinh giua cac version neu workflow dang dung plugin nay. |
| `DisplayName` | Co | Ten hien thi tren FE. |
| `Description` | Co | Mo ta ngan cho catalog/node library. |
| `Category` | Co | Nhom plugin tren FE, vi du `Data Manipulation`, `Integration`, `API`. |
| `Icon` | Co | Ten icon lucide, vi du `lucide-type`, `lucide-send`, `lucide-box`. |
| `InputType` | Khuyen dung | Class input de backend sinh JSON Schema. Tra `null` neu input dong. |
| `OutputType` | Khuyen dung | Class output de backend sinh JSON Schema. Tra `null` neu khong co output co cau truc. |
| `ExecuteAsync` | Co | Logic chinh cua plugin. |
| `CompensateAsync` | Co | Logic rollback/cleanup. Tra success neu khong co gi de rollback. |

## `PluginContext`

`PluginContext` gom:

| Member | Mo ta |
| --- | --- |
| `Payload` | Chuoi JSON goc duoc engine truyen vao plugin. |
| `Root` | `JsonElement` root da clone. |
| `CancellationToken` | Token huy tu runtime. |
| `Get<T>(key)` | Lay field theo ten, khong phan biet hoa thuong. Neu deserialize loi, tra default. |
| `GetRaw(key)` | Lay `JsonElement` raw. |

Vi du:

```csharp
var text = context.Get<string>("Text");
var count = context.Get<int?>("Count") ?? 0;
```

## `PluginResult`

Plugin tra ket qua qua factory method:

```csharp
return PluginResult.Success(new { Result = "OK" });
return PluginResult.Failure("Input Text is required.");
return PluginResult.Suspend("Dang cho phe duyet...");
```

| Ket qua | Engine hieu la |
| --- | --- |
| `Success(outputs)` | Node thanh cong, luu output va dispatch transition tiep theo. |
| `Failure(message)` | Node loi, runtime co the retry hoac mark failed. |
| `Suspend(message)` | Node tam dung. Workflow cho event/resume ben ngoai. |

## Cach 1: Implement truc tiep `IWorkflowPlugin`

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
    public string DisplayName => "Xu ly Van ban";
    public string Description => "Bien doi chuoi dau vao.";
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

Cach nay linh hoat nhat. Ban tu doc `PluginContext` va tu validate input.

## Cach 2: Ke thua `WorkflowPluginBase<TInput, TOutput>`

`WorkflowPluginBase` tu deserialize `context.Payload` thanh `TInput`, chay DataAnnotations validation va goi `ExecuteLogicAsync`.

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
    public override string Description => "Gui tin nhan Telegram.";
    public override string Category => "Integration";
    public override string Icon => "lucide-send";

    protected override Task<SendTelegramOutput> ExecuteLogicAsync(
        SendTelegramInput input,
        CancellationToken ct)
    {
        // Goi API Telegram tai day.
        return Task.FromResult(new SendTelegramOutput { Status = "Sent" });
    }
}
```

Cach nay phu hop voi plugin input/output co cau truc ro rang. Loi parse JSON, loi validation va exception trong logic se duoc convert thanh `PluginResult.Failure(...)`.

## Tao schema cho FE

Backend dung `PluginSchemaGenerator.GenerateSchema(InputType)` va `OutputType` de tao JSON Schema OpenAPI 3. FE dung schema nay de render form.

Nen lam:

- Dat property PascalCase ro rang, vi FE va `PluginContext.Get<T>` ho tro case-insensitive.
- Dung nullable reference type de the hien field co the rong.
- Dung DataAnnotations nhu `[Required]`, `[Range]`, `[StringLength]` neu dung `WorkflowPluginBase`.
- Dung enum cho select co danh sach co dinh.
- Dung `[UiField]` khi can widget dac biet.

Vi du input co dropdown dong:

```csharp
using AWE.Sdk.v2.Attributes;

public class CronLikeInput
{
    public string CronExpression { get; set; } = "0 * * * *";

    [UiField(
        Widget = "select",
        Label = "Mui gio",
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

DLL output thuong nam tai:

```text
bin/Release/net10.0/MyPlugin.dll
```

Chi upload DLL plugin chinh. Neu plugin co dependency rieng, runtime hien tai can dam bao dependency do load duoc boi `PluginLoadContext`. Nen han che dependency ngoai hoac dong goi/phat hanh theo chuan loader cua he thong.

## Validate va upload

Quy trinh tren UI:

1. Vao **Plugins**.
2. Tao package voi `ExecutionMode = DynamicDll`.
3. Upload version moi, chon file `.dll`.
4. Backend validate assembly:
   - File phai la .NET assembly hop le.
   - Phai co class concrete implement `AWE.Sdk.v2.IWorkflowPlugin`.
   - Validator trich metadata `Name`, `DisplayName`, `Description`, `Category`, `Icon`.
   - Validator sinh `InputSchema` va `OutputSchema`.
5. Backend tinh SHA256, upload DLL len storage, luu `ExecutionMetadata`.
6. Activate version de catalog co the su dung.

API tuong ung:

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

Khi Dynamic DLL node chay:

1. Engine lay active version va execution metadata.
2. Loader tai DLL ve temp path.
3. Tao `PluginLoadContext` rieng.
4. Tim class implement `IWorkflowPlugin`.
5. Tao instance bang `ActivatorUtilities.CreateInstance(...)`, vi vay constructor co the nhan service tu DI neu service do da duoc dang ky trong host.
6. Tao `PluginContext(payload, ct)`.
7. Goi `ExecuteAsync` hoac `CompensateAsync`.
8. Unload context, xoa temp file va goi GC de giam memory leak.

## Best practices

- Giu `Name` bat bien sau khi workflow da duoc publish.
- Version breaking change nen upload version moi, khong thay the DLL cu.
- Khong luu mutable static state neu khong bat buoc; neu co, clear trong `CompensateAsync`.
- Ton trong `CancellationToken`.
- Khong throw cho loi validation du lieu nguoi dung; tra `PluginResult.Failure(...)`.
- Chi throw cho loi bat thuong ma runtime retry co the xu ly.
- Output nen la object co schema ro rang de FE mapping de hon.
- `CompensateAsync` nen idempotent: goi nhieu lan khong gay loi.

## Loi thuong gap

| Loi | Nguyen nhan | Cach xu ly |
| --- | --- | --- |
| `Missing IWorkflowPlugin implementation in DLL` | DLL khong co class implement `AWE.Sdk.v2.IWorkflowPlugin` hoac tham chieu sai SDK. | Kiem tra namespace `AWE.Sdk.v2` va build lai. |
| `Not a valid .NET assembly` | Upload sai file hoac target/runtime khong tuong thich. | Upload DLL build tu project .NET hop le target `net10.0`. |
| Schema rong `{}` | `InputType`/`OutputType` tra `null`. | Tra ve `typeof(MyInput)` va `typeof(MyOutput)`. |
| FE khong hien icon mong muon | Icon string khong co trong mapping FE. | Dung icon lucide da map nhu `lucide-type`, `lucide-send`, `lucide-box`, hoac them mapping FE. |
| Constructor plugin loi | Service trong constructor chua dang ky DI. | Dang ky service trong host hoac bo dependency khoi constructor. |
