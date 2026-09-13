using System.Security.Cryptography;
using System.Text;

namespace Patientenpfad.AutoDownload.Tests;

public sealed class ArtifactFileStoreTests
{
    private readonly ArtifactFileStore store = new();

    [Theory]
    [InlineData("arztbrief.pdf")]
    [InlineData("arztbrief.xml")]
    [InlineData("arztbrief.gdt")]
    public async Task StoresAllArtifactTypesInTheSameDirectory(string fileName)
    {
        using var directory = new TemporaryDirectory();
        var bytes = Encoding.UTF8.GetBytes("identischer Transportpfad");

        var result = await store.StoreAsync(
            new MemoryStream(bytes),
            fileName,
            Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant(),
            directory.Path,
            CancellationToken.None);

        Assert.Equal(ArtifactStoreStatus.Stored, result.Status);
        Assert.Equal(bytes, await File.ReadAllBytesAsync(System.IO.Path.Combine(directory.Path, fileName)));
        Assert.Single(Directory.GetFiles(directory.Path));
    }

    [Theory]
    [InlineData("../datei.pdf")]
    [InlineData("..\\datei.pdf")]
    [InlineData("unterordner/datei.pdf")]
    [InlineData("C:\\Patientenpfad\\datei.pdf")]
    [InlineData("datei..pdf")]
    [InlineData("NUL.pdf")]
    [InlineData("COM1")]
    [InlineData("datei.pdf.")]
    [InlineData("datei.pdf ")]
    [InlineData("")]
    public async Task RejectsUnsafeServerFileNames(string fileName)
    {
        using var directory = new TemporaryDirectory();

        var result = await store.StoreAsync(
            new MemoryStream([1, 2, 3]),
            fileName,
            new string('0', 64),
            directory.Path,
            CancellationToken.None);

        Assert.Equal(ArtifactStoreStatus.InvalidFileName, result.Status);
        Assert.Empty(Directory.GetFiles(directory.Path));
    }

    [Fact]
    public async Task WritesTemporaryFileThenAtomicallyRenamesIt()
    {
        using var directory = new TemporaryDirectory();
        var bytes = Encoding.UTF8.GetBytes("vollstaendige Datei");

        var result = await store.StoreAsync(
            new MemoryStream(bytes),
            "datei.pdf",
            Convert.ToHexString(SHA256.HashData(bytes)),
            directory.Path,
            CancellationToken.None);

        Assert.True(result.CanAcknowledge);
        Assert.True(File.Exists(System.IO.Path.Combine(directory.Path, "datei.pdf")));
        Assert.DoesNotContain(Directory.GetFiles(directory.Path), path => path.EndsWith(".tmp", StringComparison.Ordinal));
    }

    [Fact]
    public async Task DeletesTemporaryFileOnHashMismatch()
    {
        using var directory = new TemporaryDirectory();

        var result = await store.StoreAsync(
            new MemoryStream([1, 2, 3]),
            "datei.xml",
            new string('0', 64),
            directory.Path,
            CancellationToken.None);

        Assert.Equal(ArtifactStoreStatus.HashMismatch, result.Status);
        Assert.False(result.CanAcknowledge);
        Assert.Empty(Directory.GetFiles(directory.Path));
    }

    [Fact]
    public async Task AcceptsExistingIdenticalFile()
    {
        using var directory = new TemporaryDirectory();
        var bytes = Encoding.UTF8.GetBytes("bereits gespeichert");
        await File.WriteAllBytesAsync(System.IO.Path.Combine(directory.Path, "datei.gdt"), bytes);

        var result = await store.StoreAsync(
            new MemoryStream([9, 9, 9]),
            "datei.gdt",
            Convert.ToHexString(SHA256.HashData(bytes)),
            directory.Path,
            CancellationToken.None);

        Assert.Equal(ArtifactStoreStatus.ExistingIdentical, result.Status);
        Assert.True(result.CanAcknowledge);
        Assert.Equal(bytes, await File.ReadAllBytesAsync(result.FinalPath!));
    }

    [Fact]
    public async Task StoresDifferentFileUnderDeterministicHashSuffix()
    {
        using var directory = new TemporaryDirectory();
        var existing = Encoding.UTF8.GetBytes("bestehend");
        var incoming = Encoding.UTF8.GetBytes("neu");
        var path = System.IO.Path.Combine(directory.Path, "datei.pdf");
        await File.WriteAllBytesAsync(path, existing);
        var incomingHash = Convert.ToHexString(SHA256.HashData(incoming)).ToLowerInvariant();

        var result = await store.StoreAsync(
            new MemoryStream(incoming),
            "datei.pdf",
            incomingHash,
            directory.Path,
            CancellationToken.None);

        var collisionPath = System.IO.Path.Combine(
            directory.Path,
            $"datei_{incomingHash[..12]}.pdf");
        Assert.Equal(ArtifactStoreStatus.Stored, result.Status);
        Assert.True(result.CanAcknowledge);
        Assert.Equal(existing, await File.ReadAllBytesAsync(path));
        Assert.Equal(incoming, await File.ReadAllBytesAsync(collisionPath));
        Assert.Equal(collisionPath, result.FinalPath);
    }
}
