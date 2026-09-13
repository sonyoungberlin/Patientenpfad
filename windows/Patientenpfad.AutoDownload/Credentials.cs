using System.Security.Cryptography;
using System.Text.Json;

namespace Patientenpfad.AutoDownload;

public sealed record DeviceCredential(string DeviceId, string Secret)
{
    public static DeviceCredential FromEnrollment(string deviceId, string credential)
    {
        var prefix = $"{deviceId}.";
        if (string.IsNullOrWhiteSpace(deviceId) ||
            !credential.StartsWith(prefix, StringComparison.Ordinal) ||
            credential.Length == prefix.Length)
        {
            throw new InvalidDataException("Enrollment-Credential ist ungültig.");
        }

        return new DeviceCredential(deviceId, credential[prefix.Length..]);
    }
}

public interface IDeviceCredentialStore
{
    Task SaveAsync(DeviceCredential credential, CancellationToken cancellationToken);
    Task<DeviceCredential?> LoadAsync(CancellationToken cancellationToken);
}

public interface ICredentialProtector
{
    byte[] Protect(byte[] plaintext);
    byte[] Unprotect(byte[] protectedBytes);
}

public sealed class DpapiCredentialProtector : ICredentialProtector
{
    private static readonly byte[] Entropy = "Patientenpfad.AutoDownload.v1"u8.ToArray();

#pragma warning disable CA1416
    public byte[] Protect(byte[] plaintext) => ProtectedData.Protect(
        plaintext,
        Entropy,
        DataProtectionScope.LocalMachine);

    public byte[] Unprotect(byte[] protectedBytes) => ProtectedData.Unprotect(
        protectedBytes,
        Entropy,
        DataProtectionScope.LocalMachine);
    #pragma warning restore CA1416
}

public sealed class DpapiDeviceCredentialStore : IDeviceCredentialStore
{
    private readonly string path;
    private readonly ICredentialProtector protector;
    private readonly bool requiresWindows;

    public DpapiDeviceCredentialStore(
        string? configuredPath = null,
        ICredentialProtector? protector = null)
    {
        path = string.IsNullOrWhiteSpace(configuredPath)
            ? Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                "Patientenpfad",
                "AutoDownload",
                "credentials.dat")
            : Path.GetFullPath(configuredPath);
            this.protector = protector ?? new DpapiCredentialProtector();
            requiresWindows = protector is null;
    }

    public async Task SaveAsync(DeviceCredential credential, CancellationToken cancellationToken)
    {
        if (requiresWindows && !OperatingSystem.IsWindows())
        {
            throw new PlatformNotSupportedException("DPAPI-Credentials können nur unter Windows gespeichert werden.");
        }

        var directory = Path.GetDirectoryName(path)
            ?? throw new InvalidOperationException("CredentialStorePath benötigt ein Verzeichnis.");
        Directory.CreateDirectory(directory);
        var plaintext = JsonSerializer.SerializeToUtf8Bytes(credential);
        try
        {
            var protectedBytes = protector.Protect(plaintext);
            var temporaryPath = Path.Combine(directory, $".{Path.GetFileName(path)}.{Guid.NewGuid():N}.tmp");
            await File.WriteAllBytesAsync(temporaryPath, protectedBytes, cancellationToken);
            File.Move(temporaryPath, path, true);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }

    public async Task<DeviceCredential?> LoadAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(path)) return null;
        if (requiresWindows && !OperatingSystem.IsWindows())
        {
            throw new PlatformNotSupportedException("DPAPI-Credentials können nur unter Windows gelesen werden.");
        }

        var protectedBytes = await File.ReadAllBytesAsync(path, cancellationToken);
        var plaintext = protector.Unprotect(protectedBytes);
        try
        {
            return JsonSerializer.Deserialize<DeviceCredential>(plaintext);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }
}
