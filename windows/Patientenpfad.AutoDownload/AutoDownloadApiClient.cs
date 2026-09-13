using System.Net;
using System.Net.Http.Headers;

namespace Patientenpfad.AutoDownload;

public sealed class DeviceAuthenticationException(HttpStatusCode statusCode)
    : Exception($"Geräteauthentifizierung fehlgeschlagen ({(int)statusCode}).")
{
    public HttpStatusCode StatusCode { get; } = statusCode;
}

public sealed class FetchedArtifact(
    HttpResponseMessage response,
    Stream content,
    string fileName,
    string deliveryId,
    string leaseToken,
    string contentSha256) : IAsyncDisposable
{
    public Stream Content { get; } = content;
    public string FileName { get; } = fileName;
    public string DeliveryId { get; } = deliveryId;
    public string LeaseToken { get; } = leaseToken;
    public string ContentSha256 { get; } = contentSha256;

    public async ValueTask DisposeAsync()
    {
        await Content.DisposeAsync();
        response.Dispose();
    }
}

public sealed record FetchResult(bool HasArtifact, FetchedArtifact? Artifact)
{
    public static FetchResult Empty { get; } = new(false, null);
}

public sealed class AutoDownloadApiClient(HttpClient httpClient)
{
    public async Task<FetchResult> FetchNextAsync(
        Uri serverBaseUrl,
        DeviceCredential credential,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            new Uri(serverBaseUrl, "/api/auto-download-devices/next"));
        AddDeviceAuthorization(request, credential);
        var response = await httpClient.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);

        if (response.StatusCode == HttpStatusCode.NoContent)
        {
            response.Dispose();
            return FetchResult.Empty;
        }
        ThrowIfAuthenticationFailed(response);
        if (!response.IsSuccessStatusCode)
        {
            response.Dispose();
            throw new HttpRequestException(
                $"Fetch fehlgeschlagen ({(int)response.StatusCode}).",
                null,
                response.StatusCode);
        }

        try
        {
            var fileName = ReadFileName(response.Content.Headers.ContentDisposition);
            var deliveryId = ReadRequiredHeader(response, "X-Auto-Download-Delivery-Id");
            var leaseToken = ReadRequiredHeader(response, "X-Auto-Download-Lease-Token");
            var contentSha256 = ReadRequiredHeader(response, "X-Content-SHA256");
            var content = await response.Content.ReadAsStreamAsync(cancellationToken);
            return new FetchResult(
                true,
                new FetchedArtifact(response, content, fileName, deliveryId, leaseToken, contentSha256));
        }
        catch
        {
            response.Dispose();
            throw;
        }
    }

    public async Task<bool> AcknowledgeAsync(
        Uri serverBaseUrl,
        DeviceCredential credential,
        string deliveryId,
        string leaseToken,
        CancellationToken cancellationToken)
    {
        var encodedDeliveryId = Uri.EscapeDataString(deliveryId);
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            new Uri(serverBaseUrl, $"/api/auto-download-devices/deliveries/{encodedDeliveryId}/ack"));
        AddDeviceAuthorization(request, credential);
        request.Headers.TryAddWithoutValidation("X-Auto-Download-Lease-Token", leaseToken);
        using var response = await httpClient.SendAsync(request, cancellationToken);
        ThrowIfAuthenticationFailed(response);
        return response.IsSuccessStatusCode;
    }

    private static void AddDeviceAuthorization(HttpRequestMessage request, DeviceCredential credential)
    {
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Device",
            $"{credential.DeviceId}.{credential.Secret}");
    }

    private static void ThrowIfAuthenticationFailed(HttpResponseMessage response)
    {
        if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
        {
            var statusCode = response.StatusCode;
            response.Dispose();
            throw new DeviceAuthenticationException(statusCode);
        }
    }

    private static string ReadFileName(ContentDispositionHeaderValue? contentDisposition)
    {
        var value = contentDisposition?.FileNameStar ?? contentDisposition?.FileName;
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidDataException("Content-Disposition enthält keinen Dateinamen.");
        }
        return value.Trim('"');
    }

    private static string ReadRequiredHeader(HttpResponseMessage response, string name)
    {
        if (!response.Headers.TryGetValues(name, out var values))
        {
            throw new InvalidDataException($"Pflichtheader {name} fehlt.");
        }
        var headers = values.Take(2).ToArray();
        return headers.Length != 1 || string.IsNullOrWhiteSpace(headers[0])
            ? throw new InvalidDataException($"Pflichtheader {name} ist ungültig.")
            : headers[0];
    }
}
