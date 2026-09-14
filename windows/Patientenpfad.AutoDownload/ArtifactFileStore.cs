using System.Security.Cryptography;
using System.Text;

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

internal enum ArtifactStoreOperation
{
    OpenTemp,
    CopyContent,
    FlushTemp,
    HashTemp,
    HashFinal,
    MoveFinal,
    DeleteTemp,
}

internal sealed class ArtifactStoreIOException(
    ArtifactStoreOperation operation,
    IOException exception) : IOException("Artifact store operation failed.", exception)
{
    public ArtifactStoreOperation Operation { get; } = operation;
    public string ExceptionType { get; } = exception.GetType().Name;
    public int OriginalHResult { get; } = exception.HResult;
}

public sealed class ArtifactFileStore
{
    internal const int MaxFinalFileNameLength = 216;
    private const int FileNameHashSuffixLength = 12;
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
        var finalFileName = CreateWindowsFileName(serverFileName);
        if (finalFileName is null)
        {
            return new ArtifactStoreResult(ArtifactStoreStatus.InvalidFileName);
        }

        RunIo(ArtifactStoreOperation.OpenTemp, () => Directory.CreateDirectory(targetDirectory));
        var finalPath = Path.Combine(targetDirectory, finalFileName);
        var existingHash = await RunIoAsync(
            ArtifactStoreOperation.HashFinal,
            () => TryComputeSha256Async(finalPath, cancellationToken));
        if (existingHash is not null)
        {
            if (HashesEqual(existingHash, expectedHash))
            {
                return new ArtifactStoreResult(ArtifactStoreStatus.ExistingIdentical, finalPath);
            }

            var extension = Path.GetExtension(serverFileName);
            var nameWithoutExtension = Path.GetFileNameWithoutExtension(finalFileName);
            var hashSuffix = Convert.ToHexString(expectedHash)[..12].ToLowerInvariant();
            finalFileName = CreateWindowsFileName($"{nameWithoutExtension}_{hashSuffix}{extension}")!;
            finalPath = Path.Combine(targetDirectory, finalFileName);
            var collisionHash = await RunIoAsync(
                ArtifactStoreOperation.HashFinal,
                () => TryComputeSha256Async(finalPath, cancellationToken));
            if (collisionHash is not null)
            {
                return HashesEqual(collisionHash, expectedHash)
                    ? new ArtifactStoreResult(ArtifactStoreStatus.ExistingIdentical, finalPath)
                    : new ArtifactStoreResult(ArtifactStoreStatus.ExistingConflict, finalPath);
            }
        }

        var temporaryPath = Path.Combine(
            targetDirectory,
            $".{Path.GetFileName(finalPath)}.{Guid.NewGuid():N}.tmp");
        var handedOff = false;
        try
        {
            var destination = RunIo(
                ArtifactStoreOperation.OpenTemp,
                () => new FileStream(
                    temporaryPath,
                    FileMode.CreateNew,
                    FileAccess.Write,
                    FileShare.None,
                    81920,
                    FileOptions.Asynchronous | FileOptions.WriteThrough));
            try
            {
                await RunIoAsync(
                    ArtifactStoreOperation.CopyContent,
                    () => content.CopyToAsync(destination, cancellationToken));
                await RunIoAsync(
                    ArtifactStoreOperation.FlushTemp,
                    () => destination.FlushAsync(cancellationToken));
            }
            finally
            {
                await RunIoAsync(
                    ArtifactStoreOperation.FlushTemp,
                    () => destination.DisposeAsync().AsTask());
            }

            var actualHash = await RunIoAsync(
                ArtifactStoreOperation.HashTemp,
                () => ComputeSha256Async(temporaryPath, cancellationToken));
            if (!HashesEqual(actualHash, expectedHash))
            {
                return new ArtifactStoreResult(ArtifactStoreStatus.HashMismatch);
            }

            for (var moveAttempt = 0; ; moveAttempt++)
            {
                try
                {
                    RunIo(
                        ArtifactStoreOperation.MoveFinal,
                        () => File.Move(temporaryPath, finalPath, false));
                    handedOff = true;
                    return new ArtifactStoreResult(ArtifactStoreStatus.Stored, finalPath);
                }
                catch (ArtifactStoreIOException) when (moveAttempt == 0)
                {
                    existingHash = await RunIoAsync(
                        ArtifactStoreOperation.HashFinal,
                        () => TryComputeSha256Async(finalPath, cancellationToken));
                    if (existingHash is not null)
                    {
                        return HashesEqual(existingHash, expectedHash)
                            ? new ArtifactStoreResult(ArtifactStoreStatus.ExistingIdentical, finalPath)
                            : new ArtifactStoreResult(ArtifactStoreStatus.ExistingConflict, finalPath);
                    }
                }
            }
        }
        finally
        {
            if (!handedOff)
            {
                RunIo(
                    ArtifactStoreOperation.DeleteTemp,
                    () => File.Delete(temporaryPath));
            }
        }
    }

    private static void RunIo(ArtifactStoreOperation operation, Action action)
    {
        try
        {
            action();
        }
        catch (IOException exception)
        {
            throw new ArtifactStoreIOException(operation, exception);
        }
    }

    private static T RunIo<T>(ArtifactStoreOperation operation, Func<T> action)
    {
        try
        {
            return action();
        }
        catch (IOException exception)
        {
            throw new ArtifactStoreIOException(operation, exception);
        }
    }

    private static async Task RunIoAsync(ArtifactStoreOperation operation, Func<Task> action)
    {
        try
        {
            await action();
        }
        catch (IOException exception)
        {
            throw new ArtifactStoreIOException(operation, exception);
        }
    }

    private static async Task<T> RunIoAsync<T>(
        ArtifactStoreOperation operation,
        Func<Task<T>> action)
    {
        try
        {
            return await action();
        }
        catch (IOException exception)
        {
            throw new ArtifactStoreIOException(operation, exception);
        }
    }

    private static string? CreateWindowsFileName(string fileName)
    {
        if (fileName.Length <= MaxFinalFileNameLength) return fileName;

        var extension = Path.GetExtension(fileName);
        var suffix = "_" + Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(fileName)))[..FileNameHashSuffixLength]
            .ToLowerInvariant();
        var baseNameLength = MaxFinalFileNameLength - extension.Length - suffix.Length;
        if (baseNameLength <= 0) return null;

        var baseName = Path.GetFileNameWithoutExtension(fileName);
        var truncatedLength = Math.Min(baseNameLength, baseName.Length);
        if (truncatedLength > 0 && char.IsHighSurrogate(baseName[truncatedLength - 1]))
        {
            truncatedLength--;
        }
        return $"{baseName[..truncatedLength]}{suffix}{extension}";
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

    private static async Task<byte[]?> TryComputeSha256Async(
        string path,
        CancellationToken cancellationToken)
    {
        try
        {
            await using var stream = new FileStream(
                path,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read | FileShare.Delete,
                81920,
                FileOptions.Asynchronous | FileOptions.SequentialScan);
            return await SHA256.HashDataAsync(stream, cancellationToken);
        }
        catch (FileNotFoundException)
        {
            return null;
        }
        catch (DirectoryNotFoundException)
        {
            return null;
        }
    }

    private static bool HashesEqual(byte[] first, byte[] second) =>
        first.Length == second.Length && CryptographicOperations.FixedTimeEquals(first, second);
}
