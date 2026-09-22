using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;

namespace Patientenpfad.AutoDownload.Tests;

public sealed class DownloadCycleTests
{
    private static readonly Uri Server = new("https://patientenpfad.example");
    private static readonly DeviceCredential Credential = new("device-1", "device-secret");

    [Fact]
    public async Task NoContentReturnsNoArtifactAndDoesNotWrite()
    {
        using var directory = new TemporaryDirectory();
        var handler = new StubHttpMessageHandler((_, _, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.NoContent)));
        var cycle = CreateCycle(handler, out _);

        var result = await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        Assert.Equal(DownloadCycleResult.NoArtifact, result);
        Assert.Empty(Directory.GetFiles(directory.Path));
        Assert.Equal(1, handler.CallCount);
    }

    [Theory]
    [InlineData("befund.pdf", "application/pdf")]
    [InlineData("befund.xml", "application/xml")]
    [InlineData("befund.gdt", "application/octet-stream")]
    public async Task UsesServerFileNameAndAcknowledgesOnlyAfterFinalWrite(string fileName, string mediaType)
    {
        using var directory = new TemporaryDirectory();
        var bytes = Encoding.UTF8.GetBytes("Dateiinhalt");
        var ackObservedFinalFile = false;
        var handler = new StubHttpMessageHandler((request, call, _) =>
        {
            Assert.Equal(
                $"Device {Credential.DeviceId}.{Credential.Secret}",
                request.Headers.Authorization?.ToString());
            if (call == 1) return Task.FromResult(FileResponse(fileName, mediaType, bytes));
            ackObservedFinalFile = File.Exists(System.IO.Path.Combine(directory.Path, fileName));
            Assert.Equal("lease-secret", request.Headers.GetValues("X-Auto-Download-Lease-Token").Single());
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        });
        var cycle = CreateCycle(handler, out _);

        var result = await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        Assert.Equal(DownloadCycleResult.Delivered, result);
        Assert.True(ackObservedFinalFile);
        Assert.Equal(bytes, await File.ReadAllBytesAsync(System.IO.Path.Combine(directory.Path, fileName)));
        Assert.Equal(2, handler.CallCount);
    }

    [Fact]
    public async Task DownloadsAndAcknowledgesPdfXmlAndGdtForOneCompletedCase()
    {
        using var directory = new TemporaryDirectory();
        var artifacts = new[]
        {
            (FileName: "vorgang.pdf", MediaType: "application/pdf", Bytes: Encoding.UTF8.GetBytes("PDF")),
            (FileName: "vorgang.xml", MediaType: "application/xml", Bytes: Encoding.UTF8.GetBytes("XML")),
            (FileName: "vorgang.gdt", MediaType: "application/octet-stream", Bytes: Encoding.UTF8.GetBytes("GDT")),
        };
        var fetchIndex = 0;
        var ackCount = 0;
        var handler = new StubHttpMessageHandler((request, call, _) =>
        {
            if (call % 2 == 0)
            {
                var artifact = artifacts[ackCount];
                Assert.True(File.Exists(System.IO.Path.Combine(directory.Path, artifact.FileName)));
                ackCount++;
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
            }

            if (fetchIndex == artifacts.Length)
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NoContent));
            }

            var next = artifacts[fetchIndex++];
            return Task.FromResult(FileResponse(next.FileName, next.MediaType, next.Bytes));
        });
        var cycle = CreateCycle(handler, out _);

        Assert.Equal(DownloadCycleResult.Delivered, await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None));
        Assert.Equal(DownloadCycleResult.Delivered, await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None));
        Assert.Equal(DownloadCycleResult.Delivered, await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None));
        Assert.Equal(DownloadCycleResult.NoArtifact, await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None));

        foreach (var artifact in artifacts)
        {
            Assert.Equal(artifact.Bytes, await File.ReadAllBytesAsync(System.IO.Path.Combine(directory.Path, artifact.FileName)));
        }

        Assert.Equal(3, ackCount);
        Assert.Equal(7, handler.CallCount);
    }

    [Fact]
    public async Task AcknowledgesWhenExternalDistributorMovesFinalFileBeforeAck()
    {
        using var inbox = new TemporaryDirectory();
        using var destination = new TemporaryDirectory();
        var bytes = Encoding.UTF8.GetBytes("lokal uebergeben");
        var distributedPath = System.IO.Path.Combine(destination.Path, "datei.pdf");
        var distributed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var watcher = new FileSystemWatcher(inbox.Path)
        {
            Filter = "datei.pdf",
            NotifyFilter = NotifyFilters.FileName,
            EnableRaisingEvents = true,
        };
        void Distribute(FileSystemEventArgs args)
        {
            try
            {
                File.Move(args.FullPath, distributedPath);
                distributed.TrySetResult();
            }
            catch (Exception exception)
            {
                distributed.TrySetException(exception);
            }
        }
        watcher.Created += (_, args) => Distribute(args);
        watcher.Renamed += (_, args) => Distribute(args);

        var handler = new StubHttpMessageHandler(async (_, call, cancellationToken) =>
        {
            if (call == 1) return FileResponse("datei.pdf", "application/pdf", bytes);
            if (call == 2)
            {
                await distributed.Task.WaitAsync(cancellationToken);
                Assert.False(File.Exists(System.IO.Path.Combine(inbox.Path, "datei.pdf")));
                return new HttpResponseMessage(HttpStatusCode.OK);
            }
            return new HttpResponseMessage(HttpStatusCode.NoContent);
        });
        var cycle = CreateCycle(handler, out _);

        var result = await cycle.RunAsync(
            Server,
            Credential,
            inbox.Path,
            CancellationToken.None);
        var nextResult = await cycle.RunAsync(
            Server,
            Credential,
            inbox.Path,
            CancellationToken.None);

        Assert.Equal(DownloadCycleResult.Delivered, result);
        Assert.Equal(DownloadCycleResult.NoArtifact, nextResult);
        Assert.Equal(bytes, await File.ReadAllBytesAsync(distributedPath));
        Assert.Equal(3, handler.CallCount);
    }

    [Fact]
    public async Task HashMismatchDeletesTemporaryFileAndSendsNoAck()
    {
        using var directory = new TemporaryDirectory();
        var handler = new StubHttpMessageHandler((_, _, _) =>
            Task.FromResult(FileResponse("datei.pdf", "application/pdf", [1, 2, 3], new string('0', 64))));
        var cycle = CreateCycle(handler, out _);

        var result = await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        Assert.Equal(DownloadCycleResult.RetryLater, result);
        Assert.Empty(Directory.GetFiles(directory.Path));
        Assert.Equal(1, handler.CallCount);
    }

    [Fact]
    public async Task ContentIOExceptionLogsOnlyStoreOperationTypeAndHResult()
    {
        using var directory = new TemporaryDirectory();
        const string sensitiveDetail = "patient-name path token hash";
        var response = FileResponse("sensitive-name.pdf", "application/pdf", [1, 2, 3]);
        response.Content = new StreamContent(new ThrowingReadStream(sensitiveDetail));
        response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
        {
            FileName = "\"sensitive-name.pdf\"",
        };
        var handler = new StubHttpMessageHandler((_, _, _) => Task.FromResult(response));
        var cycle = CreateCycle(handler, out var logger);

        var result = await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        Assert.Equal(DownloadCycleResult.RetryLater, result);
        Assert.Equal(1, handler.CallCount);
        Assert.Empty(Directory.GetFiles(directory.Path));
        Assert.Contains("Datei-Header empfangen.", logger.Messages);
        Assert.DoesNotContain("Datei empfangen.", logger.Messages);
        var failure = Assert.Single(logger.Messages, message =>
            message.Contains("AutoDownload store failed", StringComparison.Ordinal));
        Assert.Contains("FailureStage CopyContent", failure, StringComparison.Ordinal);
        Assert.Contains("ExceptionType IOException", failure, StringComparison.Ordinal);
        Assert.Contains("HResult -2146232800", failure, StringComparison.Ordinal);
        Assert.DoesNotContain(sensitiveDetail, failure, StringComparison.Ordinal);
        Assert.DoesNotContain("sensitive-name", failure, StringComparison.Ordinal);
        Assert.DoesNotContain("delivery-1", failure, StringComparison.Ordinal);
        Assert.DoesNotContain("lease-secret", failure, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ExistingIdenticalFileCanBeAcknowledged()
    {
        using var directory = new TemporaryDirectory();
        var bytes = Encoding.UTF8.GetBytes("identisch");
        await File.WriteAllBytesAsync(System.IO.Path.Combine(directory.Path, "datei.xml"), bytes);
        var handler = new StubHttpMessageHandler((_, call, _) => Task.FromResult(
            call == 1
                ? FileResponse("datei.xml", "application/xml", bytes)
                : new HttpResponseMessage(HttpStatusCode.OK)));
        var cycle = CreateCycle(handler, out _);

        var result = await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        Assert.Equal(DownloadCycleResult.Delivered, result);
        Assert.Equal(2, handler.CallCount);
    }

    [Fact]
    public async Task ExistingDifferentFileIsStoredWithHashSuffixAndAcknowledged()
    {
        using var directory = new TemporaryDirectory();
        var path = System.IO.Path.Combine(directory.Path, "datei.pdf");
        await File.WriteAllTextAsync(path, "bestehend");
        var incoming = Encoding.UTF8.GetBytes("anders");
        var incomingHash = Convert.ToHexString(SHA256.HashData(incoming)).ToLowerInvariant();
        var handler = new StubHttpMessageHandler((_, _, _) =>
            Task.FromResult(FileResponse("datei.pdf", "application/pdf", incoming)));
        var cycle = CreateCycle(handler, out _);

        var result = await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        Assert.Equal(DownloadCycleResult.Delivered, result);
        Assert.Equal("bestehend", await File.ReadAllTextAsync(path));
        Assert.Equal(
            incoming,
            await File.ReadAllBytesAsync(System.IO.Path.Combine(
                directory.Path,
                $"datei_{incomingHash[..12]}.pdf")));
        Assert.Equal(2, handler.CallCount);
    }

    [Theory]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.Conflict)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    public async Task FailedAcknowledgementKeepsFinalFileAndLogsStatus(HttpStatusCode statusCode)
    {
        using var directory = new TemporaryDirectory();
        var bytes = Encoding.UTF8.GetBytes("lokal gespeichert");
        var handler = new StubHttpMessageHandler((_, call, _) => Task.FromResult(
            call == 1
                ? FileResponse("datei.pdf", "application/pdf", bytes)
                : new HttpResponseMessage(statusCode)));
        var cycle = CreateCycle(handler, out var logger);

        var result = await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        Assert.Equal(DownloadCycleResult.RetryLater, result);
        Assert.Equal(bytes, await File.ReadAllBytesAsync(System.IO.Path.Combine(directory.Path, "datei.pdf")));
        Assert.Equal(2, handler.CallCount);
        Assert.Contains(logger.Messages, message =>
            message.Contains($"HTTP-Status {(int)statusCode}", StringComparison.Ordinal) &&
            message.Contains("ArtifactType PDF", StringComparison.Ordinal) &&
            message.Contains("DeliveryId delivery-1", StringComparison.Ordinal) &&
            message.Contains("LocalStored True", StringComparison.Ordinal) &&
            message.Contains("AckSucceeded False", StringComparison.Ordinal) &&
            message.Contains("FailureStage AckHttpStatus", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData(false, "Network")]
    [InlineData(true, "Timeout")]
    public async Task AcknowledgementTransportFailureLogsItsStage(bool timeout, string failureStage)
    {
        using var directory = new TemporaryDirectory();
        var bytes = Encoding.UTF8.GetBytes("lokal gespeichert");
        var handler = new StubHttpMessageHandler((_, call, _) =>
            call == 1
                ? Task.FromResult(FileResponse("datei.pdf", "application/pdf", bytes))
                : Task.FromException<HttpResponseMessage>(timeout
                    ? new TaskCanceledException("sensitive-timeout-detail")
                    : new HttpRequestException("sensitive-network-detail")));
        var cycle = CreateCycle(handler, out var logger);

        var result = await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        Assert.Equal(DownloadCycleResult.RetryLater, result);
        Assert.Contains(logger.Messages, message =>
            message.Contains("Phase Ack", StringComparison.Ordinal) &&
            message.Contains("Endpoint ack", StringComparison.Ordinal) &&
            message.Contains($"FailureStage {failureStage}", StringComparison.Ordinal));
        var logs = string.Join("\n", logger.Messages);
        Assert.DoesNotContain("sensitive", logs, StringComparison.Ordinal);
        Assert.DoesNotContain(Credential.Secret, logs, StringComparison.Ordinal);
        Assert.DoesNotContain("lease-secret", logs, StringComparison.Ordinal);
    }

    [Fact]
    public async Task NetworkFailureCanBeRetried()
    {
        using var directory = new TemporaryDirectory();
        var handler = new StubHttpMessageHandler((_, call, _) =>
            call == 1
                ? throw new HttpRequestException("offline")
                : Task.FromResult(new HttpResponseMessage(HttpStatusCode.NoContent)));
        var cycle = CreateCycle(handler, out _);

        Assert.Equal(DownloadCycleResult.RetryLater, await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None));
        Assert.Equal(DownloadCycleResult.NoArtifact, await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None));
        Assert.Equal(2, handler.CallCount);
    }

    [Fact]
    public async Task HttpClientTimeoutCanBeRetriedWithoutLoggingSecrets()
    {
        using var directory = new TemporaryDirectory();
        var handler = new StubHttpMessageHandler((_, _, _) =>
            Task.FromException<HttpResponseMessage>(new TaskCanceledException(
                $"Timeout with {Credential.Secret} and lease-secret")));
        var cycle = CreateCycle(handler, out var logger);

        var result = await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        Assert.Equal(DownloadCycleResult.RetryLater, result);
        Assert.Contains(logger.Messages, message =>
            message.Contains("Phase Fetch", StringComparison.Ordinal) &&
            message.Contains("Endpoint next", StringComparison.Ordinal) &&
            message.Contains("FailureStage Timeout", StringComparison.Ordinal));
        var logs = string.Join("\n", logger.Messages);
        Assert.DoesNotContain(Credential.Secret, logs, StringComparison.Ordinal);
        Assert.DoesNotContain("lease-secret", logs, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RequestedCancellationIsNotLoggedOrConvertedToRetry()
    {
        using var directory = new TemporaryDirectory();
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        var handler = new StubHttpMessageHandler(async (_, _, cancellationToken) =>
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.NoContent);
        });
        var cycle = CreateCycle(handler, out var logger);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            cycle.RunAsync(Server, Credential, directory.Path, cancellation.Token));

        Assert.Empty(logger.Messages);
    }

    [Theory]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.Forbidden)]
    public async Task AuthenticationErrorsAreReportedCleanly(HttpStatusCode statusCode)
    {
        using var directory = new TemporaryDirectory();
        var handler = new StubHttpMessageHandler((_, _, _) =>
            Task.FromResult(new HttpResponseMessage(statusCode)));
        var cycle = CreateCycle(handler, out var logger);

        var result = await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        Assert.Equal(DownloadCycleResult.AuthenticationFailed, result);
        Assert.Contains(logger.Messages, message =>
            message.Contains($"HTTP-Status {(int)statusCode}", StringComparison.Ordinal) &&
            message.Contains("FailureStage Authentication", StringComparison.Ordinal));
    }

    [Fact]
    public async Task LogsNeverContainCredentialOrLeaseToken()
    {
        using var directory = new TemporaryDirectory();
        var bytes = Encoding.UTF8.GetBytes("Inhalt");
        var handler = new StubHttpMessageHandler((_, call, _) => Task.FromResult(
            call == 1
                ? FileResponse("medizinischer-dateiname.pdf", "application/pdf", bytes)
                : new HttpResponseMessage(HttpStatusCode.InternalServerError)));
        var cycle = CreateCycle(handler, out var logger);

        await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        var logs = string.Join("\n", logger.Messages);
        Assert.DoesNotContain(Credential.Secret, logs, StringComparison.Ordinal);
        Assert.DoesNotContain("lease-secret", logs, StringComparison.Ordinal);
        Assert.DoesNotContain("medizinischer-dateiname", logs, StringComparison.Ordinal);
    }

    [Fact]
    public async Task UnsafeFileNameSendsNoAck()
    {
        using var directory = new TemporaryDirectory();
        var handler = new StubHttpMessageHandler((_, _, _) =>
            Task.FromResult(FileResponse("../datei.pdf", "application/pdf", [1, 2, 3])));
        var cycle = CreateCycle(handler, out _);

        var result = await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        Assert.Equal(DownloadCycleResult.RetryLater, result);
        Assert.Equal(1, handler.CallCount);
        Assert.Empty(Directory.GetFiles(directory.Path));
    }

    [Fact]
    public async Task MissingContentDispositionSendsNoAck()
    {
        using var directory = new TemporaryDirectory();
        var response = FileResponse("datei.pdf", "application/pdf", [1, 2, 3]);
        response.Content.Headers.ContentDisposition = null;
        var handler = new StubHttpMessageHandler((_, _, _) => Task.FromResult(response));
        var cycle = CreateCycle(handler, out _);

        var result = await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        Assert.Equal(DownloadCycleResult.RetryLater, result);
        Assert.Equal(1, handler.CallCount);
        Assert.Empty(Directory.GetFiles(directory.Path));
    }

    [Fact]
    public async Task DuplicateRequiredHeaderIsRejectedWithoutStoppingCycle()
    {
        using var directory = new TemporaryDirectory();
        var response = FileResponse("datei.pdf", "application/pdf", [1, 2, 3]);
        response.Headers.Remove("X-Auto-Download-Delivery-Id");
        response.Headers.TryAddWithoutValidation(
            "X-Auto-Download-Delivery-Id",
            ["delivery-1", "delivery-2"]);
        var handler = new StubHttpMessageHandler((_, _, _) => Task.FromResult(response));
        var cycle = CreateCycle(handler, out _);

        var result = await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        Assert.Equal(DownloadCycleResult.RetryLater, result);
        Assert.Equal(1, handler.CallCount);
    }

    private static DownloadCycle CreateCycle(StubHttpMessageHandler handler, out ListLogger<DownloadCycle> logger)
    {
        logger = new ListLogger<DownloadCycle>();
        return new DownloadCycle(
            new AutoDownloadApiClient(new HttpClient(handler)),
            new ArtifactFileStore(),
            logger);
    }

    private static HttpResponseMessage FileResponse(
        string fileName,
        string mediaType,
        byte[] bytes,
        string? sha256 = null)
    {
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(bytes),
        };
        response.Content.Headers.ContentType = new MediaTypeHeaderValue(mediaType);
        response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
        {
            FileName = $"\"{fileName}\"",
        };
        response.Headers.Add("X-Auto-Download-Delivery-Id", "delivery-1");
        response.Headers.Add("X-Auto-Download-Lease-Token", "lease-secret");
        response.Headers.Add(
            "X-Auto-Download-Artifact-Type",
            mediaType == "application/pdf" ? "PDF" : mediaType == "application/xml" ? "XML" : "GDT");
        response.Headers.Add(
            "X-Content-SHA256",
            sha256 ?? Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant());
        return response;
    }

    private sealed class ThrowingReadStream(string message) : MemoryStream
    {
        public override ValueTask<int> ReadAsync(
            Memory<byte> buffer,
            CancellationToken cancellationToken = default) =>
            ValueTask.FromException<int>(new IOException(message));
    }
}
