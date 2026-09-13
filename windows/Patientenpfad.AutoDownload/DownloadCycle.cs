using System.Security.Cryptography;
using Microsoft.Extensions.Logging;

namespace Patientenpfad.AutoDownload;

public enum DownloadCycleResult
{
    NoArtifact,
    Delivered,
    RetryLater,
    AuthenticationFailed,
}

public interface IDownloadCycle
{
    Task<DownloadCycleResult> RunAsync(
        Uri serverBaseUrl,
        DeviceCredential credential,
        string targetDirectory,
        CancellationToken cancellationToken);
}

public sealed class DownloadCycle(
    AutoDownloadApiClient apiClient,
    ArtifactFileStore fileStore,
    ILogger<DownloadCycle> logger) : IDownloadCycle
{
    public async Task<DownloadCycleResult> RunAsync(
        Uri serverBaseUrl,
        DeviceCredential credential,
        string targetDirectory,
        CancellationToken cancellationToken)
    {
        try
        {
            var fetch = await apiClient.FetchNextAsync(serverBaseUrl, credential, cancellationToken);
            if (!fetch.HasArtifact)
            {
                logger.LogDebug("Keine Datei verfügbar.");
                return DownloadCycleResult.NoArtifact;
            }

            await using var artifact = fetch.Artifact!;
            logger.LogInformation("Datei empfangen.");
            var stored = await fileStore.StoreAsync(
                artifact.Content,
                artifact.FileName,
                artifact.ContentSha256,
                targetDirectory,
                cancellationToken);
            if (!stored.CanAcknowledge)
            {
                logger.LogError("Datei konnte nicht sicher gespeichert werden. Status {StoreStatus}.", stored.Status);
                return DownloadCycleResult.RetryLater;
            }

            logger.LogInformation(
                stored.Status == ArtifactStoreStatus.Stored
                    ? "Datei gespeichert und SHA-256 bestätigt."
                    : "Datei ist bereits identisch vorhanden.");
            var acknowledged = await apiClient.AcknowledgeAsync(
                serverBaseUrl,
                credential,
                artifact.DeliveryId,
                artifact.LeaseToken,
                cancellationToken);
            if (!acknowledged)
            {
                logger.LogError("ACK fehlgeschlagen.");
                return DownloadCycleResult.RetryLater;
            }

            logger.LogInformation("ACK erfolgreich.");
            return DownloadCycleResult.Delivered;
        }
        catch (DeviceAuthenticationException exception)
        {
            logger.LogError("Geräteauthentifizierung fehlgeschlagen. HTTP-Status {StatusCode}.", (int)exception.StatusCode);
            return DownloadCycleResult.AuthenticationFailed;
        }
        catch (HttpRequestException exception)
        {
            logger.LogError(exception, "Netzwerk- oder Serverfehler beim Auto-Download.");
            return DownloadCycleResult.RetryLater;
        }
        catch (InvalidDataException exception)
        {
            logger.LogError(exception, "Ungültige Download-Antwort.");
            return DownloadCycleResult.RetryLater;
        }
        catch (Exception exception) when (exception is IOException or CryptographicException)
        {
            logger.LogError(
                "Lokaler Datei- oder Prüfsummenfehler ({ErrorType}).",
                exception.GetType().Name);
            return DownloadCycleResult.RetryLater;
        }
    }
}
