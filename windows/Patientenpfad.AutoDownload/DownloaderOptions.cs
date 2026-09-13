namespace Patientenpfad.AutoDownload;

public sealed class DownloaderOptions
{
    public const string SectionName = "AutoDownload";

    public string ServerBaseUrl { get; set; } = "";
    public string TargetDirectory { get; set; } = @"C:\Patientenpfad\Inbox";
    public int PollIntervalSeconds { get; set; } = 10;
    public string CredentialStorePath { get; set; } = "";

    public TimeSpan PollInterval => TimeSpan.FromSeconds(Math.Max(1, PollIntervalSeconds));
}
