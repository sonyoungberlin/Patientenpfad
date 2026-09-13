using System.Net;
using System.Text;
using System.Text.Json;

namespace Patientenpfad.AutoDownload.Tests;

public sealed class EnrollmentTests
{
    [Fact]
    public async Task EnrollmentPersistsCredentialOnlyThroughProtector()
    {
        using var directory = new TemporaryDirectory();
        var path = System.IO.Path.Combine(directory.Path, "credentials.dat");
        var protector = new XorProtector();
        var store = new DpapiDeviceCredentialStore(path, protector);
        const string credential = "device-1.top-secret-credential";
        const string enrollmentCode = "one-time-enrollment-code";
        var handler = new StubHttpMessageHandler((request, _, _) =>
        {
            Assert.Equal("/api/auto-download-devices/enroll", request.RequestUri?.AbsolutePath);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(new { deviceId = "device-1", credential }),
                    Encoding.UTF8,
                    "application/json"),
            });
        });
        var logger = new ListLogger<EnrollmentClient>();
        var client = new EnrollmentClient(new HttpClient(handler), store, logger);

        var success = await client.EnrollAsync(
            new Uri("https://patientenpfad.example"),
            enrollmentCode,
            CancellationToken.None);

        Assert.True(success);
        var persisted = await File.ReadAllBytesAsync(path);
        Assert.DoesNotContain(credential, Encoding.UTF8.GetString(persisted), StringComparison.Ordinal);
        Assert.Equal(
            new DeviceCredential("device-1", "top-secret-credential"),
            await store.LoadAsync(CancellationToken.None));
        var logs = string.Join("\n", logger.Messages);
        Assert.DoesNotContain(credential, logs, StringComparison.Ordinal);
        Assert.DoesNotContain(enrollmentCode, logs, StringComparison.Ordinal);
    }

    [Fact]
    public async Task EnrollmentRejectsCredentialForDifferentDevice()
    {
        var store = new InMemoryDeviceCredentialStore();
        var handler = new StubHttpMessageHandler((_, _, _) => Task.FromResult(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(new
                    {
                        deviceId = "device-1",
                        credential = "device-2.secret",
                    }),
                    Encoding.UTF8,
                    "application/json"),
            }));
        var logger = new ListLogger<EnrollmentClient>();
        var client = new EnrollmentClient(new HttpClient(handler), store, logger);

        var success = await client.EnrollAsync(
            new Uri("https://patientenpfad.example"),
            "one-time-code",
            CancellationToken.None);

        Assert.False(success);
        Assert.Null(await store.LoadAsync(CancellationToken.None));
    }

    private sealed class XorProtector : ICredentialProtector
    {
        public byte[] Protect(byte[] plaintext) => plaintext.Select(value => (byte)(value ^ 0xA5)).ToArray();
        public byte[] Unprotect(byte[] protectedBytes) => Protect(protectedBytes);
    }
}
