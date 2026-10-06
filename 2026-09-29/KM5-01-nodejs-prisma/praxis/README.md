# Praxis-Scaffold — Node.js + Prisma 7 + SQLite (KM5-01)

Lauffähiges Projekt zu **Aufgabe 2** (Setup) und **Aufgabe 3** (Playlist N:M).
Node ist hier nur **Transportmittel für die Prisma-Werkzeugkette** — der
allgemeine Unterrichtscode bleibt Deno/TypeScript.

## Einrichten (Reihenfolge!)

```bash
npm install                      # prisma@7, @prisma/client@7, adapter, dotenv
npm i -D tsx
npm approve-scripts --all        # Node blockt Install-Scripts -> better-sqlite3 muss gebaut werden
npm install                      # baut die freigegebenen Pakete
npm run db:generate              # erzeugt generated/prisma/ (postinstall kann in der ersten Runde fehlen)
npm run db:migrate -- --name init
npm run db:seed
```

Danach:

```bash
npm run run          # 5 Diagnose-Queries -> exakt 5 Konsolen-Zeilen
npm test             # 6 Tests (node:test über tsx)
npm run playlist     # Aufgabe 3: Song-Anzahl pro Playlist, EINE Abfrage
```

## Zwei Hürden, die nicht in der Lesson stehen

1. **`postinstall: prisma generate` braucht das Schema.** Wer `npm i` in ein
   leeres Projekt wie die Lesson-Schritte 1–2 reinschiebt, bekommt einen
   Fehler, weil `prisma/schema.prisma` noch nicht existiert. Deshalb hier:
   Schema + `.env` + `prisma7.config.ts` **vor** `npm install` anlegen.
2. **`approve-scripts` ohne zweites `npm install` baut nichts.** Die Freigabe
   nimmt nur den Haken vor, das kompilieren passiert erst beim nächsten Install.

## Prüfliste gegen die typischen Fehler (Lesson §8)

| Falle | Status hier |
|---|---|
| Ungepinntes `npm i prisma` → 8.0.0-RC | `npm ls prisma` = **7.10.0** |
| Generator `prisma-client-js` (CommonJS, bricht unter ESM) | Generator = **`prisma-client`** |
| `new PrismaClient()` ohne Adapter | `src/db.ts` übergibt `{ adapter }` |
| Keine `.env` / kein `DATABASE_URL` | `.env` + `.env.example` vorhanden |
| Install-Scripts geblockt → `better-sqlite3` ungebaut | `better_sqlite3.node` existiert |
| `having` auf `_count._all` | `having: { kuenstlerId: { _count: { gte: 2 } } }` |
| Import ohne `.ts`-Endung | `../generated/prisma/client.ts` |

## Dateien

| Datei | Zweck |
|---|---|
| `prisma/schema.prisma` | Modelle `Label`, `Kuenstler`, `Song`, `Playlist` |
| `prisma/migrations/` | `init` + `playlist` — echtes SQL, lesbar |
| `prisma7.config.ts` | CLI-Konfiguration, `DATABASE_URL` aus `.env` |
| `src/db.ts` | EIN `PrismaClient` + `PrismaBetterSqlite3`-Adapter |
| `src/seed.ts` | Mini-Musik-DB (4 Künstler, 1 ohne Label, 7 Songs, 2 Playlists) |
| `src/queries.ts` | die 5 Diagnose-Queries als Prisma-API (+ `$queryRaw`-Self-JOIN) |
| `src/playlist.ts` | Aufgabe 3: `findMany` mit `_count.songs` — eine Abfrage |
| `test/queries.test.ts` | 6 Assertions |

## N:M: Playlist → Song

`model Playlist { songs Song[] }` auf beiden Seiten reicht — Prisma legt die
implizite Zwischentabelle `_PlaylistToSong` selbst an. Abfrage der Song-Anzahl
pro Playlist:

```ts
prisma.playlist.findMany({
  select: { name: true, _count: { select: { songs: true } } },
})
```

Das entspricht SQL `SELECT p.name, COUNT(*) FROM Playlist p
LEFT JOIN _PlaylistToSong ... GROUP BY p.id`.

**Fluchtweg:** einen Self-JOIN gibt es in der API nicht → `prisma.$queryRaw`
(siehe `labelPaare()` in `src/queries.ts`).
