# Antworten KM5-03 — Unterabfragen I (Skalar, Zeile, Tabelle)

**Abgabe:** Prisma-7-Projekt → [`km5-03-prisma/`](./km5-03-prisma/) (Modelle
`Label`/`Kuenstler`/`Song`, dieselben fünf Abfragen wie in der Lesson, je ein
Kommentar pro Abfrage in `src/queries.ts`). Die frühere reine SQL-Datei
`unterabfragen.sql` ist damit ersetzt — die Datenbasis ist derselbe Seed (3
Labels, 6 Künstler, 10 Songs, Ø 212,5 s).

Wo die Prisma-API echte Verschachtelung nicht abbilden kann, wird rohes SQL über
`$queryRaw` benutzt (der bekannte Fluchtweg aus KM5-01); die Fälle, die die API
sauber kann, sind zusätzlich als Prisma-Variante daneben gestellt.

## 1. Vorhersage: Durchschnitts-Abfrage

```ts
// src/queries.ts
SELECT titel, dauerSek
FROM Song
WHERE dauerSek > (SELECT AVG(dauerSek) FROM Song)
ORDER BY dauerSek DESC
```

**Vorhersage:** Der innere Ausdruck liefert _einen Wert_: 2125 / 10 Songs =
**212,5**. Geliefert werden nur Songs mit `dauerSek > 212.5` — **genau 4
Zeilen**: Freies Feld (250), Hafenlicht (240), Dust Choir (230), TalEcho (220).
Die kürzeren Songs (210, 205, 200, 195, 190, 185) fehlen.

**Nach dem Ausführen:** Vorhersage bestätigt — Ausgabe 1) in `npm run run`
listet exakt diese vier Songs, und Test 1 vergleicht die Titelliste mit dem
erwarteten Array.

Dieselbe Frage ohne SQL (Variante 1b):
`prisma.song.aggregate({ _avg: { dauerSek: true } })` liefert 212,5, danach
`prisma.song.findMany({ where: { dauerSek: { gt: 212.5 } } })` — zwei Roundtrips
statt einer verschachtelten Abfrage, dafür typsicher. Test 2 prüft, dass beide
Wege dasselbe Ergebnis liefern.

## 2. Die drei Formen

| Form        | Ort     | Umsetzung in Prisma 7                                                                       | Ergebnis                   |
| ----------- | ------- | ------------------------------------------------------------------------------------------- | -------------------------- |
| **Skalar**  | `WHERE` | `$queryRaw`: `dauerSek > (SELECT AVG(dauerSek) FROM Song)` (nur Auer, `kuenstlerId = 1`)    | Hafenlicht (240)           |
| **Tabelle** | `FROM`  | `$queryRaw`: `FROM (… COUNT(*) … GROUP BY l.id) AS t WHERE t.n > 2`                         | Nordklang (4), Suedton (4) |
| **Zeile**   | `WHERE` | `$queryRaw`: `(kuenstlerId, dauerSek) = (SELECT kuenstlerId, MAX(dauerSek) …)` (Künstler 6) | Freies Feld (250)          |

Regeln, die dabei greifen (Lesson-Abschnitt 6):

- Subquery in `SELECT`/`WHERE` als Einzelwert → muss **skalar** sein.
- Subquery in `FROM` → **Alias ist in SQLite Pflicht** (`AS t`), sonst
  Syntaxfehler.
- Tupelvergleich → die Subquery muss **genau eine Zeile** mit passender
  Spaltenzahl liefern.

Prisma-Besonderheiten in diesem Projekt:

- Die API-Namen folgen dem Schema: Tabelle `Song`, Spalte `dauerSek` — **nicht**
  `song.dauer_sek` aus der alten SQL-Datei. Das rohe SQL muss sich daran halten.
- `$queryRaw` liefert `COUNT(*)` aus SQLite als **BigInt** (`4n`), die
  Prisma-API als `number` (`4`). Ohne Umrechnung schlägt der Vergleich fehl —
  dieser Fehler ist beim ersten Testlauf tatsächlich aufgetreten und wurde durch
  `Number(r.n)` behoben.
- Der `PrismaClient` braucht Prisma 7 zwingend mit Driver-Adapter
  (`PrismaBetterSqlite3`) — ohne `{ adapter }` startet er nicht,
  `prisma-client-js` würde unter ESM als CommonJS brechen.

## 3. Interleaving: dieselbe Frage als Subquery und als JOIN

Frage: **„Welche Labels haben mehr als 2 Songs?"**

**Variante A — Tabellen-Subquery** (innen zählen, außen filtern,
`src/queries.ts` `labelsMitMehrAls2Songs`):

```sql
SELECT t.name, t.n
FROM (
  SELECT l.name AS name, COUNT(*) AS n
  FROM Label l JOIN Kuenstler k ON k.labelId = l.id
               JOIN Song s ON s.kuenstlerId = k.id
  GROUP BY l.id
) AS t
WHERE t.n > 2
ORDER BY t.n DESC, t.name
```

**Variante B — JOIN mit `HAVING`** (alles in einer Abfrage, `labelsJoinHaving`):

```sql
SELECT l.name AS name, COUNT(*) AS n
FROM Label l JOIN Kuenstler k ON k.labelId = l.id
             JOIN Song s ON s.kuenstlerId = k.id
GROUP BY l.id
HAVING COUNT(*) > 2
ORDER BY n DESC, l.name
```

**Variante C — Prisma-API** (`labelsMitMehrAls2SongsPrisma`): `_count` liefert
die Song-Anzahl, gefiltert wird im Code — `HAVING` auf Relations-Counts kann die
API nicht ausdrücken.

**Ergebnis alle drei:** Nordklang (4), Suedton (4) — identisch. Test 6
vergleicht A gegen B, Test 7 A gegen C.

**Welche Form liest sich klarer?** Die JOIN-Variante ist kürzer (ein Statement,
`GROUP BY` + `HAVING` ist der Standardweg). Die Subquery-Variante macht die zwei
Schritte „erst zählen, dann filtern" explizit — das bleibt lesbarer, wenn der
äußere Filter wächst (z. B. zusätzlich nach Jahr filtern) oder die innere
Ergebnismenge zweimal gebraucht wird. Die Prisma-API-Variante ist am
umständlichsten (Zählung im Speicher), dafür komplett typsicher. Bei weiterer
Verschachtelung wäre ohnehin ein CTE (Ausblick KM5-04) die nächste Stufe.

## 4. Nachweis: Demo und Tests

Prisma-Projekt `km5-03-prisma/` — `npm run db:generate`,
`npm run db:migrate --
--name init`, `npm run db:seed`, danach `npm run run`:

```text
1) Über dem Durchschnitt:         [
  { titel: 'Freies Feld', dauerSek: 250 },
  { titel: 'Hafenlicht', dauerSek: 240 },
  { titel: 'Dust Choir', dauerSek: 230 },
  { titel: 'TalEcho', dauerSek: 220 }
]
1b) Dito als Prisma-API:          [ … dieselben vier Songs … ]
2a) Auer über dem Durchschnitt:   [ { titel: 'Hafenlicht', dauerSek: 240 } ]
2b) Labels mit 2+ Songs (FROM):   [ { name: 'Nordklang', n: 4 }, { name: 'Suedton', n: 4 } ]
2c) Freis längster Song:          { titel: 'Freies Feld', dauerSek: 250, kuenstlerId: 6 }
3) Labels mit 2+ Songs (JOIN):    [ { name: 'Nordklang', n: 4 }, { name: 'Suedton', n: 4 } ]
3b) Dito als Prisma-API:          [ { name: 'Nordklang', n: 4 }, { name: 'Suedton', n: 4 } ]
```

`npm test`:

```text
✔ Vorhersage: 4 Songs über dem Durchschnitt (212.5)
✔ Prisma-API liefert dieselben Songs wie die Subquery
✔ Skalar in WHERE: nur Hafenlicht liegt über dem Schnitt
✔ Tabellen-Subquery: Nordklang und Suedton je 4 Songs
✔ Zeilen-Subquery: Freis längster Song ist Freies Feld
✔ Interleaving: JOIN+HAVING liefert dasselbe wie die Subquery
✔ Prisma-API-Variante des Label-Filters liefert dasselbe Ergebnis
ℹ tests 7 | pass 7 | fail 0
```

Zusätzlich das mitgelieferte Beispielprojekt `km5-03-unterabfragen/`
(unverändert, diente als Vorlage für den Seed) — `deno task demo`:

```text
Songs über dem Durchschnitt: [
  { titel: "Freies Feld", dauer_sek: 250 },
  { titel: "Hafenlicht", dauer_sek: 240 },
  { titel: "Dust Choir", dauer_sek: 230 },
  { titel: "TalEcho", dauer_sek: 220 }
]
Mit Durchschnittsspalte (1 Zeile): { titel: "Bergwind", dauer_sek: 195, durchschnitt: 212.5 }
Künstler mit 2+ Songs: [ { name: "Auer", n: 3 }, { name: "Demir", n: 2 }, { name: "Frei", n: 2 } ]
Auers längster Song: { titel: "Hafenlicht", dauer_sek: 240 }
```

und `deno task test`: `ok | 4 passed | 0 failed`.

**Screenshots zum Nachreichen:** (1) `npm run run` im Ordner `km5-03-prisma`
(zeigt alle sieben Ausgaben), (2) `npm test` (7 grüne Tests), (3) optional
`deno task demo` im Ordner `km5-03-unterabfragen`.
