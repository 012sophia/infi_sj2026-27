# Antworten KM5-02 — Normalisierung mit Prisma 7

## 1. Vorhersage: `bestellung_denorm(bestell_nr, kunde, plz, ort)`

| Normalform | Verletzt? | Begründung |
|---|---|---|
| **1NF** | Nein | Alle Beispieldaten sind atomar; es gibt keine Listen oder Wiederholgruppen. |
| **2NF** | Nein | `bestell_nr` ist ein Einzelschlüssel. Daher gibt es keine partielle Abhängigkeit von einem Schlüsselteil. |
| **3NF** | **Ja** | `bestell_nr → plz` und `plz → ort`: `ort` hängt transitiv über den Nichtschlüssel `plz` von `bestell_nr` ab. |

## 2. Zerlegung bis 3NF

1. 1NF Keine Zerlegung nötig; alle Werte sind atomar.
2. 2NF Keine Zerlegung nötig; `bestell_nr → kunde, plz, ort`. Da `bestell_nr` ein Einzelschlüssel ist, gibt es keine partielle Abhängigkeit und 2NF ist automatisch erfüllt.
3. 3NF `plz → ort` in ein eigenes Modell auslagern. Die Daten setzen voraus, dass jede PLZ genau einen Ort bestimmt.


```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "sqlite"
}

model Plz {
  plz           String        @id
  ort           String
  bestellungen  Bestellung[]
}

model Bestellung {
  bestellNr Int    @id
  kunde     String
  plz       String
  plzRel    Plz    @relation(fields: [plz], references: [plz])
}

model Kunde {
  kundeId Int     @id
  name    String
  hobbys  Hobby[]
}

model Hobby {
  kundeId Int
  hobby   String
  kunde   Kunde   @relation(fields: [kundeId], references: [kundeId])

  @@id([kundeId, hobby])
}

model Song {
  songId    Int            @id
  titel     String
  playlists SongPlaylist[]
}

model Playlist {
  playlistId Int            @id
  name       String
  songs      SongPlaylist[]
}

model SongPlaylist {
  songId     Int
  playlistId Int
  song       Song     @relation(fields: [songId], references: [songId])
  playlist   Playlist @relation(fields: [playlistId], references: [playlistId])

  @@id([songId, playlistId])
}
```

Beispiel für die Prisma-7-Konfiguration in `prisma.config.ts`:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
```

In `.env` steht zum Beispiel `DATABASE_URL="file:./dev.db"`. Die SQLite-Verbindung wird in Prisma 7 über einen Driver Adapter hergestellt; eine passende Initialisierung in `src/db.ts` ist:

```ts
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.ts";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });
```

**Abhängigkeitspfeile:**
- Vorher: `bestellNr → plz → ort` (transitive Abhängigkeit über `plz`).
- Nachher: `bestellNr → kunde, plz` und `plz → ort`; der Ort steht genau einmal pro PLZ.

## 3. Zwei Quiz-Tabellen zerlegen

### Tabelle A: `kunde_hobby_denorm` (1NF-Verletzung)

**Verletzung:** `hobbys` enthält beispielsweise `"Lesen, Schwimmen"` als Liste in einer Zelle. Im normalisierten Modell steht jedes Hobby in einer eigenen Zeile. Der zusammengesetzte Schlüssel ist wichtig, damit ein Kunde mehrere Hobbys haben kann.

Die folgenden TypeScript-Beispiele verwenden `import { prisma } from "./db.ts"` und laufen als ES-Modul.

```ts
import { prisma } from "./db.ts";

await prisma.kunde.create({ data: { kundeId: 1, name: "Auer" } });
await prisma.kunde.create({ data: { kundeId: 2, name: "Beck" } });
await prisma.kunde.create({ data: { kundeId: 3, name: "Cevik" } });

await prisma.hobby.create({ data: { kundeId: 1, hobby: "Lesen" } });
await prisma.hobby.create({ data: { kundeId: 1, hobby: "Schwimmen" } });
await prisma.hobby.create({ data: { kundeId: 2, hobby: "Schach" } });

await prisma.$disconnect();
```

Abhängigkeiten: `kundeId → name`; der Schlüssel der Hobby-Tabelle ist `(kundeId, hobby)`.

### Tabelle B: `song_playlist_denorm` (2NF-Verletzung)

**Verletzung:** In `song_playlist(song_id, playlist_id, song_titel)` hängt `song_titel` nur von `song_id` ab, also nur von einem Teil des zusammengesetzten Schlüssels `(song_id, playlist_id)`. Der Titel kommt deshalb ins Modell `Song`; `SongPlaylist` enthält nur die Beziehung.

```ts
import { prisma } from "./db.ts";

await prisma.song.create({ data: { songId: 1, titel: "Silent Lines" } });
await prisma.song.create({ data: { songId: 2, titel: "Night Ferry" } });
await prisma.song.create({ data: { songId: 3, titel: "Dust Choir" } });

await prisma.playlist.create({ data: { playlistId: 10, name: "Fokus" } });
await prisma.playlist.create({ data: { playlistId: 20, name: "Nachtfahrt" } });
await prisma.playlist.create({ data: { playlistId: 30, name: "Lauftraining" } });

await prisma.songPlaylist.create({ data: { songId: 1, playlistId: 10 } });
await prisma.songPlaylist.create({ data: { songId: 1, playlistId: 20 } });
await prisma.songPlaylist.create({ data: { songId: 2, playlistId: 20 } });
await prisma.songPlaylist.create({ data: { songId: 3, playlistId: 30 } });

await prisma.$disconnect();
```

Abhängigkeiten: `songId → titel`; der Schlüssel der Beziehungstabelle ist `(songId, playlistId)`. So kann derselbe Song in mehreren Playlists vorkommen.

## 4. Demo-Nachweis

Die Aufgabe verlangt einen Screenshot der vier Konsolenzeilen aus `deno task demo`. Dieser tatsächliche Ausführungsnachweis ist noch separat zu ergänzen.

