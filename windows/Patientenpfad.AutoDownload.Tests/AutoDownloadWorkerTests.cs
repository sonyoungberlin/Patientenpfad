using Microsoft.Extensions.Options;

namespace Patientenpfad.AutoDownload.Tests;

public sealed class AutoDownloadWorkerTests
{
    [Fact]
    public async Task NoContentWaitsBeforePollingAgain()
    {
        using var directory = new TemporaryDirectory();
        var cycle = new ControlledDownloadCycle(DownloadCycleResult.NoArtifact);
        var worker = await CreateWorkerAsync(cycle, directory.Path);

        await worker.StartAsync(CancellationToken.None);
        await cycle.WaitForCallsAsync(1);
        await Task.Delay(100);

        Assert.Equal(1, cycle.CallCount);
        await worker.StopAsync(CancellationToken.None);
    }

    [Fact]
    public async Task NetworkFailureResultWaitsBeforeRetry()
    {
        using var directory = new TemporaryDirectory();
        var cycle = new ControlledDownloadCycle(DownloadCycleResult.RetryLater);
        var worker = await CreateWorkerAsync(cycle, directory.Path);

        await worker.StartAsync(CancellationToken.None);
        await cycle.WaitForCallsAsync(1);
        await Task.Delay(100);

        Assert.Equal(1, cycle.CallCount);
        await worker.StopAsync(CancellationToken.None);
    }

    [Fact]
    public async Task SuccessfulDeliveryPollsAgainImmediately()
    {
        using var directory = new TemporaryDirectory();
        var cycle = new ControlledDownloadCycle(DownloadCycleResult.Delivered);
        var worker = await CreateWorkerAsync(cycle, directory.Path);

        await worker.StartAsync(CancellationToken.None);
        await cycle.WaitForCallsAsync(2);

        Assert.True(cycle.CallCount >= 2);
        await worker.StopAsync(CancellationToken.None);
    }

    private static async Task<AutoDownloadWorker> CreateWorkerAsync(
        IDownloadCycle cycle,
        string targetDirectory)
    {
        var store = new InMemoryDeviceCredentialStore();
        await store.SaveAsync(
            new DeviceCredential("device-1", "device-secret"),
            CancellationToken.None);
        return new AutoDownloadWorker(
            cycle,
            store,
            Options.Create(new DownloaderOptions
            {
                ServerBaseUrl = "https://patientenpfad.example",
                TargetDirectory = targetDirectory,
                PollIntervalSeconds = 1,
            }),
            TimeProvider.System,
            new ListLogger<AutoDownloadWorker>());
    }

    private sealed class ControlledDownloadCycle(DownloadCycleResult firstResult) : IDownloadCycle
    {
        private readonly TaskCompletionSource firstCall = new(
            TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource secondCall = new(
            TaskCreationOptions.RunContinuationsAsynchronously);
        private int callCount;

        public int CallCount => Volatile.Read(ref callCount);

        public async Task<DownloadCycleResult> RunAsync(
            Uri serverBaseUrl,
            DeviceCredential credential,
            string targetDirectory,
            CancellationToken cancellationToken)
        {
            var call = Interlocked.Increment(ref callCount);
            if (call == 1)
            {
                firstCall.TrySetResult();
                return firstResult;
            }

            secondCall.TrySetResult();
            await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
            return DownloadCycleResult.NoArtifact;
        }

        public Task WaitForCallsAsync(int count) => (count == 1 ? firstCall.Task : secondCall.Task)
            .WaitAsync(TimeSpan.FromSeconds(2));
    }
}
