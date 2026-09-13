using System.Security.Cryptography;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Patientenpfad.AutoDownload;

public sealed class AutoDownloadWorker(
    IDownloadCycle cycle,
    IDeviceCredentialStore credentialStore,
    IOptions<DownloaderOptions> options,
    TimeProvider timeProvider,
    ILogger<AutoDownloadWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var configuration = options.Value;
        logger.LogInformation("Patientenpfad Auto-Download-Dienst gestartet.");

        DeviceCredential? credential;
        try
        {
            credential = await credentialStore.LoadAsync(stoppingToken);
        }
        catch (Exception exception) when (exception is IOException or CryptographicException or PlatformNotSupportedException)
        {
            logger.LogCritical(exception, "Gerätecredential konnte nicht geladen werden.");
            return;
        }

        if (credential is null || !Uri.TryCreate(configuration.ServerBaseUrl, UriKind.Absolute, out var serverBaseUrl))
        {
            logger.LogCritical("ServerBaseUrl oder Gerätecredential fehlt.");
            return;
        }

        Directory.CreateDirectory(configuration.TargetDirectory);
        while (!stoppingToken.IsCancellationRequested)
        {
            var result = await cycle.RunAsync(
                serverBaseUrl,
                credential,
                configuration.TargetDirectory,
                stoppingToken);
            if (result == DownloadCycleResult.Delivered) continue;

            try
            {
                await Task.Delay(configuration.PollInterval, timeProvider, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }
}
