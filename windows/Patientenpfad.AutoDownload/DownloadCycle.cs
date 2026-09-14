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
        var phase = "Fetch";
        var endpoint = "next";
        string? artifactType = null;
        string? deliveryId = null;
        var localStored = false;
        var ackSucceeded = false;
        try
        {
            var fetch = await apiClient.FetchNextAsync(serverBaseUrl, credential, cancellationToken);
            if (!fetch.HasArtifact)
            {
                logger.LogDebug("Keine Datei verfügbar.");
                return DownloadCycleResult.NoArtifact;
            }

            await using var artifact = fetch.Artifact!;
            artifactType = artifact.ArtifactType;
            deliveryId = artifact.DeliveryId;
            logger.LogInformation("Datei-Header empfangen.");
            phase = "Store";
            var stored = await fileStore.StoreAsync(
                artifact.Content,
                artifact.FileName,
                artifact.ContentSha256,
                targetDirectory,
                cancellationToken);
            if (!stored.CanAcknowledge)
            {
                var failureStage = stored.Status == ArtifactStoreStatus.HashMismatch ? "Hash" : "Store";
                LogTransferFailure(
                    failureStage,
                    endpoint,
                    null,
                    artifactType,
                    deliveryId,
                    localStored,
                    ackSucceeded,
                    failureStage);
                return DownloadCycleResult.RetryLater;
            }

            localStored = true;
            logger.LogInformation(
                stored.Status == ArtifactStoreStatus.Stored
                    ? "Datei gespeichert und SHA-256 bestätigt."
                    : "Datei ist bereits identisch vorhanden.");
            phase = "Ack";
            endpoint = "ack";
            var acknowledge = await apiClient.AcknowledgeAsync(
                serverBaseUrl,
                credential,
                artifact.DeliveryId,
                artifact.LeaseToken,
                cancellationToken);
            if (!acknowledge.IsSuccess)
            {
                LogTransferFailure(
                    phase,
                    endpoint,
                    (int)acknowledge.StatusCode,
                    artifactType,
                    deliveryId,
                    localStored,
                    ackSucceeded,
                    "AckHttpStatus");
                return DownloadCycleResult.RetryLater;
            }

            ackSucceeded = true;
            logger.LogInformation("ACK erfolgreich.");
            return DownloadCycleResult.Delivered;
        }
        catch (DeviceAuthenticationException exception)
        {
            LogTransferFailure(
                phase,
                endpoint,
                (int)exception.StatusCode,
                artifactType,
                deliveryId,
                localStored,
                ackSucceeded,
                "Authentication");
            return DownloadCycleResult.AuthenticationFailed;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            LogTransferFailure(
                phase,
                endpoint,
                null,
                artifactType,
                deliveryId,
                localStored,
                ackSucceeded,
                "Timeout");
            return DownloadCycleResult.RetryLater;
        }
        catch (HttpRequestException exception)
        {
            LogTransferFailure(
                phase,
                endpoint,
                exception.StatusCode is null ? null : (int)exception.StatusCode,
                artifactType,
                deliveryId,
                localStored,
                ackSucceeded,
                exception.StatusCode is null ? "Network" : "HttpStatus");
            return DownloadCycleResult.RetryLater;
        }
        catch (InvalidDataException)
        {
            LogTransferFailure(
                "ValidateResponse",
                "next",
                null,
                artifactType,
                deliveryId,
                localStored,
                ackSucceeded,
                "InvalidResponse");
            return DownloadCycleResult.RetryLater;
        }
        catch (ArtifactStoreIOException exception)
        {
            logger.LogError(
                "AutoDownload store failed. FailureStage {FailureStage}, ExceptionType {ExceptionType}, " +
                "HResult {HResult}.",
                exception.Operation,
                exception.ExceptionType,
                exception.OriginalHResult);
            return DownloadCycleResult.RetryLater;
        }
        catch (Exception exception) when (exception is IOException or CryptographicException)
        {
            LogTransferFailure(
                phase,
                endpoint,
                null,
                artifactType,
                deliveryId,
                localStored,
                ackSucceeded,
                exception is CryptographicException ? "Hash" : "Store");
            return DownloadCycleResult.RetryLater;
        }
    }

    private void LogTransferFailure(
        string phase,
        string endpoint,
        int? httpStatus,
        string? artifactType,
        string? deliveryId,
        bool localStored,
        bool ackSucceeded,
        string failureStage)
    {
        logger.LogError(
            "AutoDownload transfer failed. Phase {Phase}, Endpoint {Endpoint}, HTTP-Status {HttpStatus}, " +
            "ArtifactType {ArtifactType}, DeliveryId {DeliveryId}, LocalStored {LocalStored}, " +
            "AckSucceeded {AckSucceeded}, FailureStage {FailureStage}.",
            phase,
            endpoint,
            httpStatus,
            artifactType ?? "unknown",
            deliveryId ?? "none",
            localStored,
            ackSucceeded,
            failureStage);
    }
}
