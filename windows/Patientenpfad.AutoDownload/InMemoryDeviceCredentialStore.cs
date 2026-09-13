namespace Patientenpfad.AutoDownload;

public sealed class InMemoryDeviceCredentialStore : IDeviceCredentialStore
{
    private DeviceCredential? credential;

    public Task SaveAsync(DeviceCredential value, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        credential = value;
        return Task.CompletedTask;
    }

    public Task<DeviceCredential?> LoadAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(credential);
    }
}
