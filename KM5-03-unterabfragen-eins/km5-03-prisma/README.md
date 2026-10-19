# Praxis — Unterabfragen I mit Prisma 7 (KM5-03)

Ersetzt die frühere SQL-Abgabe (`unterabfragen.sql`): dieselben fünf Abfragen der
Lesson **KM5-03** (Vorhersage, Skalar/Tabelle/Zeile, Interleaving) jetzt als
**Prisma-7-Lösung** — Prisma-API, wo sie reicht, `$queryRaw` bei echten
Verschachtelungen.

## Einrichten (Reihenfolge!)

```bash
npm install                      # prisma@7, @prisma/client@7, adapter, dotenv
npm approve-scripts --all        # Node blockt Install-Scripts -> better-sqlite3 muss gebaut werden
npm install                      # baut die freigegebenen Pakete
npm run db:generate              # erzeugt generated/prisma/
npm run db:migrate -- --name init
npm run db:seed
```

Danach:

```bash
npm run run    # die 7 Ausgaben (Subqueries + Prisma-API-Varianten)
npm test       # 7 Tests (node:test über tsx)
```

## Was hier drin ist

| Datei | Zweck |
|---|---|
| `prisma/schema.prisma` | Modelle `Label`, `Kuenstler`, `Song` (Mini-Musik-DB) |
| `prisma7.config.ts` | CLI-Konfiguration, `DATABASE_URL` aus `.env` |
| `src/db.ts` | EIN `PrismaClient` + `PrismaBetterSqlite3`-Adapter |
| `src/seed.ts` | dieselbe Mini-Musik-DB wie `seed-musik-mini.sql` |
| `src/queries.ts` | die fünf Abfragen, je mit einem Kommentar |
| `test/queries.test.ts` | 7 Tests inkl. Subquery-gegen-Prisma-API-Vergleich |

## Die fünf Abfragen

| # | Form | Umsetzung in Prisma 7 |
|---|---|---|
| 1 | Skalar in `WHERE` (Vorhersage) | `$queryRaw` mit `dauerSek > (SELECT AVG(…))`; Variante 1b in reinem Prisma (`aggregate` + `findMany gt`) |
| 2a | Skalar in `WHERE` | `$queryRaw` (Auer-Songs über Ø) |
| 2b | Tabelle in `FROM` (Alias) | `$queryRaw` mit abgeleiteter Tabelle |
| 2c | Zeile (Tupelvergleich) | `$queryRaw` — Prisma kennt keinen Tupelvergleich |
| 3 | Interleaving JOIN+HAVING | `$queryRaw`; Variante 3b über Prisma-API (`_count` + Filter im Code) |

## Fallen aus der Praxis (analog KM5-01)

- `prisma-client-js` statt `prisma-client` → CommonJS, bricht unter ESM
- ohne `{ adapter }` startet Prisma 7 nicht (keine Rust-Engine mehr)
- Tabellen-/Spaltennamen: Prisma-Standard ist Modellname + TS-Name (`Song.dauerSek`),
  das rohe SQL muss sich daran halten — nicht `song.dauer_sek` aus der SQL-Datei
- `HAVING` auf Relation-Counts kann die Prisma-API nicht → Zählung im Code oder `$queryRaw`
