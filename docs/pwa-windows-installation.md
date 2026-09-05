# teamwork.contact unter Windows installieren

Die Anwendung bleibt eine zentral betriebene Online-Webanwendung. Die Browserinstallation erzeugt einen App-Eintrag und Verknüpfungen, installiert aber keine eigenständig zu aktualisierende Windows-Anwendung. Eine Internetverbindung ist erforderlich.

## Microsoft Edge

1. Die Produktionsadresse von teamwork.contact in Edge öffnen und anmelden.
2. Im Menü `...` den Bereich `Apps` öffnen.
3. `Diese Website als App installieren` auswählen und den Namen bestätigen.
4. Im anschließenden Dialog bei Bedarf Desktop-Verknüpfung, Startmenü und Taskleiste aktivieren.

## Google Chrome

1. Die Produktionsadresse von teamwork.contact in Chrome öffnen und anmelden.
2. Im Menü `...` den Eintrag `Seite als App installieren` oder `teamwork.contact installieren` auswählen. Die Bezeichnung hängt von der Chrome-Version ab.
3. Installation bestätigen und die App bei Bedarf über das Startmenü an Desktop oder Taskleiste anheften.

Die installierte App startet in einem eigenen Fenster ohne normale Browser-Tabs und Adressleiste. Browsermenü, Titelleiste, Downloadanzeigen oder Sicherheitsinformationen können weiterhin sichtbar sein.

## Betrieb und Updates

- Updates kommen weiterhin automatisch vom zentralen Deployment. Auf dem Praxis-PC muss keine App-Version manuell aktualisiert werden.
- Edge beziehungsweise Chrome selbst muss durch die IT-Verwaltung aktuell gehalten werden.
- Die Installation und Anmeldung gehören zum verwendeten Windows- und Browserprofil. Für verschiedene Benutzer sollen getrennte Konten beziehungsweise Profile verwendet werden.
- Bei gemeinsam genutzten Geräten immer abmelden und Windows bei Abwesenheit sperren.
- Die Anwendung hat keine Offline-Funktion und keinen Service Worker. Praxis-, Patienten-, Token- und andere dynamische Anwendungsdaten werden nicht für eine Offline-Nutzung zwischengespeichert.
- Patientenlinks bleiben normale HTTPS-Links. Patienten müssen die App nicht installieren.

## Deinstallation

Im App-Fenster das Browsermenü öffnen und `teamwork.contact deinstallieren` auswählen. Alternativ kann die App in den Edge- beziehungsweise Chrome-App-Einstellungen entfernt werden.