# Patientenpfad Auto-Download für Windows

Minimaler .NET-8-Worker für den dauerhaften Geräte-Download. Alle vom Server gelieferten PDF-, XML- und GDT-Dateien werden unverändert in genau einen konfigurierten Zielordner geschrieben.

## Konfiguration

`Patientenpfad.AutoDownload/appsettings.Example.json` nach `appsettings.Local.json` kopieren und mindestens `ServerBaseUrl` sowie `TargetDirectory` setzen. `appsettings.Local.json` ist ignoriert.

Alternativ können Werte über Umgebungsvariablen gesetzt werden, zum Beispiel:

```powershell
$env:PATIENTENPFAD_AutoDownload__ServerBaseUrl = "https://patientenpfad.example"
$env:PATIENTENPFAD_AutoDownload__TargetDirectory = "C:\Patientenpfad\Inbox"
```

Geräte-ID und Credential werden nicht aus JSON oder Umgebungsvariablen geladen. Der Enrollment-Modus speichert beide mit Windows-DPAPI (`LocalMachine`) unter `%ProgramData%\Patientenpfad\AutoDownload\credentials.dat`. Ein abweichender Pfad kann über `CredentialStorePath` gesetzt werden.

## Enrollment

```powershell
dotnet run --project Patientenpfad.AutoDownload -- enroll <einmal-code>
```

Danach kann der Worker zunächst als Konsole gestartet werden:

```powershell
dotnet run --project Patientenpfad.AutoDownload
```

Das Projekt verwendet `AddWindowsService` und ist damit für die spätere Registrierung beim Windows Service Control Manager vorbereitet. Ein Installer oder eine Registrierungsautomatik ist nicht enthalten.

## Build und Tests

```powershell
dotnet build Patientenpfad.AutoDownload.sln
dotnet test Patientenpfad.AutoDownload.sln
```
