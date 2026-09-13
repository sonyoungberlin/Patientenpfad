using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace Patientenpfad.AutoDownload;

public sealed class EnrollmentClient(
    HttpClient httpClient,
    IDeviceCredentialStore credentialStore,
    ILogger<EnrollmentClient> logger)
{
    public async Task<bool> EnrollAsync(
        Uri serverBaseUrl,
        string enrollmentCode,
        CancellationToken cancellationToken)
    {
        try
        {
            var endpoint = new Uri(serverBaseUrl, "/api/auto-download-devices/enroll");
            using var response = await httpClient.PostAsJsonAsync(
                endpoint,
                new { code = enrollmentCode },
                cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogError("Enrollment fehlgeschlagen. HTTP-Status {StatusCode}.", (int)response.StatusCode);
                return false;
            }

            var result = await response.Content.ReadFromJsonAsync<EnrollmentResponse>(
                cancellationToken: cancellationToken);
            if (result is null || string.IsNullOrWhiteSpace(result.DeviceId) || string.IsNullOrWhiteSpace(result.Credential))
            {
                logger.LogError("Enrollment-Antwort ist unvollständig.");
                return false;
            }

            var credential = DeviceCredential.FromEnrollment(
                result.DeviceId,
                result.Credential);
            await credentialStore.SaveAsync(credential, cancellationToken);
            logger.LogInformation("Enrollment für Gerät {DeviceId} erfolgreich.", result.DeviceId);
            return true;
        }
        catch (Exception exception) when (
            exception is HttpRequestException or
                InvalidDataException or
                JsonException or
                IOException or
                CryptographicException or
                PlatformNotSupportedException)
        {
            logger.LogError(exception, "Netzwerkfehler beim Enrollment.");
            return false;
        }
    }

    private sealed record EnrollmentResponse(
        [property: JsonPropertyName("deviceId")] string DeviceId,
        [property: JsonPropertyName("credential")] string Credential);
}
