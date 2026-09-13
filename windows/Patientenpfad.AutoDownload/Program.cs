using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Patientenpfad.AutoDownload;

var builder = Host.CreateApplicationBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: false);
builder.Configuration.AddEnvironmentVariables(prefix: "PATIENTENPFAD_");
builder.Services.Configure<DownloaderOptions>(
    builder.Configuration.GetSection(DownloaderOptions.SectionName));
builder.Services.AddWindowsService(options =>
{
    options.ServiceName = "Patientenpfad Auto-Download";
});
builder.Services.AddHttpClient<AutoDownloadApiClient>(client =>
{
    client.Timeout = TimeSpan.FromMinutes(2);
});
builder.Services.AddHttpClient<EnrollmentClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});
builder.Services.AddSingleton<ArtifactFileStore>();
builder.Services.AddSingleton<IDownloadCycle, DownloadCycle>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IDeviceCredentialStore>(services =>
{
    var options = services.GetRequiredService<IOptions<DownloaderOptions>>().Value;
    return new DpapiDeviceCredentialStore(options.CredentialStorePath);
});
builder.Services.AddHostedService<AutoDownloadWorker>();

using var host = builder.Build();
if (args.Length > 0 && string.Equals(args[0], "enroll", StringComparison.OrdinalIgnoreCase))
{
    if (args.Length != 2)
    {
        Console.Error.WriteLine("Aufruf: Patientenpfad.AutoDownload enroll <code>");
        return 2;
    }

    var options = host.Services.GetRequiredService<IOptions<DownloaderOptions>>().Value;
    if (!Uri.TryCreate(options.ServerBaseUrl, UriKind.Absolute, out var serverBaseUrl))
    {
        Console.Error.WriteLine("AutoDownload:ServerBaseUrl ist ungültig oder fehlt.");
        return 2;
    }

    var enrollment = host.Services.GetRequiredService<EnrollmentClient>();
    return await enrollment.EnrollAsync(serverBaseUrl, args[1], CancellationToken.None)
        ? 0
        : 1;
}

await host.RunAsync();
return 0;
