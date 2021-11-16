Installation der App für UseCase 3:
1) Archiv /Volumes/Daten/Customer/Media_Broadcast/Loki_POC/rep-exporter/rep-exporter.tar.gz auf Zielsystem kopieren
2) Image aus Archiv laden:
    - gunzip <ARCHIV>
    - cat rep-exporter.tar | docker load
    - docker images => ID des Image merken
3) Konfiguration der Umgebung in .env Datei (Beispiel Datei siehe /Volumes/Daten/Customer/Media_Broadcast/Loki_POC/rep-exporter/.env). Wichtige Properties:
    - HIST_DB_CON: Connection String zur Oracle DB
    - LOKI_SOURCE: Name der Source in Loki
    - LOKI_GET_LATEST_ENTRY: URL zu Loki, um letzten Log-Eintrag abzufragen
    - LOKI_POST: URL zu Loki, an die Logs gesendet wird
    - SCHEDULE: Cron-like Konfiguration, sodass die App zyklisch ausgeführt wird
4) Container starten
    - docker run -d --env-file .env --name rep-exporter <IMAGE_ID>
5) docker logs <CONTAINER_ID> zum Prüfen, ob Container richtig läuft# snr-asm-con-exporter
