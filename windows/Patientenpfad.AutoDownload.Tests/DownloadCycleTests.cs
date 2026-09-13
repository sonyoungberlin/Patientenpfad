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
    public async Task ExistingDifferentFileIsNotOverwrittenOrAcknowledged()
    {
        using var directory = new TemporaryDirectory();
        var path = System.IO.Path.Combine(directory.Path, "datei.pdf");
        await File.WriteAllTextAsync(path, "bestehend");
        var incoming = Encoding.UTF8.GetBytes("anders");
        var handler = new StubHttpMessageHandler((_, _, _) =>
            Task.FromResult(FileResponse("datei.pdf", "application/pdf", incoming)));
        var cycle = CreateCycle(handler, out _);

        var result = await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        Assert.Equal(DownloadCycleResult.RetryLater, result);
        Assert.Equal("bestehend", await File.ReadAllTextAsync(path));
        Assert.Equal(1, handler.CallCount);
    }

    [Fact]
    public async Task FailedAcknowledgementKeepsFinalFileForRetry()
    {
        using var directory = new TemporaryDirectory();
        var bytes = Encoding.UTF8.GetBytes("lokal gespeichert");
        var handler = new StubHttpMessageHandler((_, call, _) => Task.FromResult(
            call == 1
                ? FileResponse("datei.pdf", "application/pdf", bytes)
                : new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)));
        var cycle = CreateCycle(handler, out _);

        var result = await cycle.RunAsync(Server, Credential, directory.Path, CancellationToken.None);

        Assert.Equal(DownloadCycleResult.RetryLater, result);
        Assert.Equal(bytes, await File.ReadAllBytesAsync(System.IO.Path.Combine(directory.Path, "datei.pdf")));
        Assert.Equal(2, handler.CallCount);
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
        Assert.Contains(logger.Messages, message => message.Contains("Geräteauthentifizierung", StringComparison.Ordinal));
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
            "X-Content-SHA256",
            sha256 ?? Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant());
        return response;
    }
}
