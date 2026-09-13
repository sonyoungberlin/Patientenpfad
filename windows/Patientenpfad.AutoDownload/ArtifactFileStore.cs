using System.Security.Cryptography;

namespace Patientenpfad.AutoDownload;

public enum ArtifactStoreStatus
{
    Stored,
    ExistingIdentical,
    InvalidFileName,
    HashMismatch,
    ExistingConflict,
}

public sealed record ArtifactStoreResult(ArtifactStoreStatus Status, string? FinalPath = null)
{
    public bool CanAcknowledge => Status is ArtifactStoreStatus.Stored or ArtifactStoreStatus.ExistingIdentical;
}

public sealed class ArtifactFileStore
{
    private static readonly char[] ForbiddenWindowsFileNameChars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    private static readonly HashSet<string> ReservedWindowsNames = new(
        [
            "CON", "PRN", "AUX", "NUL",
            "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
            "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
        ],
        StringComparer.OrdinalIgnoreCase);

    public async Task<ArtifactStoreResult> StoreAsync(
        Stream content,
        string serverFileName,
        string expectedSha256,
        string targetDirectory,
        CancellationToken cancellationToken)
    {
        if (!IsSafeFileName(serverFileName) || !TryParseSha256(expectedSha256, out var expectedHash))
        {
            return new ArtifactStoreResult(ArtifactStoreStatus.InvalidFileName);
        }

        Directory.CreateDirectory(targetDirectory);
        var finalPath = Path.Combine(targetDirectory, serverFileName);
        if (File.Exists(finalPath))
        {
            var existingHash = await ComputeSha256Async(finalPath, cancellationToken);
            if (HashesEqual(existingHash, expectedHash))
            {
                return new ArtifactStoreResult(ArtifactStoreStatus.ExistingIdentical, finalPath);
            }

            var extension = Path.GetExtension(serverFileName);
            var nameWithoutExtension = Path.GetFileNameWithoutExtension(serverFileName);
            var hashSuffix = Convert.ToHexString(expectedHash)[..12].ToLowerInvariant();
            finalPath = Path.Combine(
                targetDirectory,
                $"{nameWithoutExtension}_{hashSuffix}{extension}");
            if (File.Exists(finalPath))
            {
                var collisionHash = await ComputeSha256Async(finalPath, cancellationToken);
                return HashesEqual(collisionHash, expectedHash)
                    ? new ArtifactStoreResult(ArtifactStoreStatus.ExistingIdentical, finalPath)
                    : new ArtifactStoreResult(ArtifactStoreStatus.ExistingConflict, finalPath);
            }
        }

        var temporaryPath = Path.Combine(
            targetDirectory,
            $".{Path.GetFileName(finalPath)}.{Guid.NewGuid():N}.tmp");
        try
        {
            await using (var destination = new FileStream(
                temporaryPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                81920,
                FileOptions.Asynchronous | FileOptions.WriteThrough))
            {
                await content.CopyToAsync(destination, cancellationToken);
                await destination.FlushAsync(cancellationToken);
            }

            var actualHash = await ComputeSha256Async(temporaryPath, cancellationToken);
            if (!HashesEqual(actualHash, expectedHash))
            {
                return new ArtifactStoreResult(ArtifactStoreStatus.HashMismatch);
            }

            try
            {
                File.Move(temporaryPath, finalPath, false);
                return new ArtifactStoreResult(ArtifactStoreStatus.Stored, finalPath);
            }
            catch (IOException) when (File.Exists(finalPath))
            {
                var existingHash = await ComputeSha256Async(finalPath, cancellationToken);
                return HashesEqual(existingHash, expectedHash)
                    ? new ArtifactStoreResult(ArtifactStoreStatus.ExistingIdentical, finalPath)
                    : new ArtifactStoreResult(ArtifactStoreStatus.ExistingConflict, finalPath);
            }
        }
        finally
        {
            if (File.Exists(temporaryPath)) File.Delete(temporaryPath);
        }
    }

    public static bool IsSafeFileName(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName) || fileName is "." or "..") return false;
        if (fileName.Contains("..", StringComparison.Ordinal)) return false;
        if (Path.IsPathRooted(fileName)) return false;
        if (fileName.IndexOfAny(ForbiddenWindowsFileNameChars) >= 0) return false;
        if (fileName.Any(char.IsControl)) return false;
        if (!string.Equals(fileName, fileName.TrimEnd(' ', '.'), StringComparison.Ordinal)) return false;
        if (ReservedWindowsNames.Contains(Path.GetFileNameWithoutExtension(fileName))) return false;
        return string.Equals(Path.GetFileName(fileName), fileName, StringComparison.Ordinal);
    }

    private static bool TryParseSha256(string value, out byte[] hash)
    {
        hash = [];
        if (value.Length != 64) return false;
        try
        {
            hash = Convert.FromHexString(value);
            return hash.Length == 32;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static async Task<byte[]> ComputeSha256Async(string path, CancellationToken cancellationToken)
    {
        await using var stream = new FileStream(
            path,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            81920,
            FileOptions.Asynchronous | FileOptions.SequentialScan);
        return await SHA256.HashDataAsync(stream, cancellationToken);
    }

    private static bool HashesEqual(byte[] first, byte[] second) =>
        first.Length == second.Length && CryptographicOperations.FixedTimeEquals(first, second);
}
