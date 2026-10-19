# Antworten KM5-03 — Unterabfragen I (Skalar, Zeile, Tabelle)

Abgabe: SQL-Datei mit je einem Kommentar →
[`unterabfragen.sql`](./unterabfragen.sql) (läuft gegen den Seed des
Beispielprojekts `km5-03-unterabfragen/seed-musik-mini.sql`).

## 1. Vorhersage: Durchschnitts-Abfrage

```sql
SELECT titel FROM song WHERE dauer_sek > (SELECT AVG(dauer_sek) FROM song);
```

**Vorhersage:** Der innere Ausdruck liefert _einen Wert_: 2125 / 10 Songs =
**212,5**. Geliefert werden nur Songs mit `dauer_sek > 212.5` — **genau 4
Zeilen**: Freies Feld (250), Hafenlicht (240), Dust Choir (230), TalEcho (220).
Die kürzeren Songs (210, 205, 200, 195, 190, 185) fehlen.

**Nach dem Ausführen:** Vorhersage bestätigt — 4 Zeilen, exakt dieselben Songs
(aus `deno task demo`: „Songs über dem Durchschnitt").

## 2. Die drei Formen

| Form        | Ort     | Query (Kurzfassung, vollständig in `unterabfragen.sql`)                            | Ergebnis                   |
| ----------- | ------- | ---------------------------------------------------------------------------------- | -------------------------- |
| **Skalar**  | `WHERE` | `dauer_sek > (SELECT AVG(dauer_sek) FROM song)` (nur Auer)                         | Hafenlicht (240)           |
| **Tabelle** | `FROM`  | `FROM (… COUNT(*) … GROUP BY l.id) AS t WHERE t.n > 2`                             | Nordklang (4), Suedton (4) |
| **Zeile**   | `WHERE` | `(kuenstler_id, dauer_sek) = (SELECT kuenstler_id, MAX(…) WHERE kuenstler_id = 6)` | Freies Feld (250)          |

Regeln, die dabei greifen (Lesson-Abschnitt 6):

- Subquery in `SELECT`/`WHERE` als Einzelwert → muss **skalar** sein.
- Subquery in `FROM` → **Alias ist in SQLite Pflicht** (`AS t`), sonst
  Syntaxfehler.
- Tupelvergleich → die Subquery muss **genau eine Zeile** mit passender
  Spaltenzahl liefern.

## 3. Interleaving: dieselbe Frage als Subquery und als JOIN

Frage: **„Welche Labels haben mehr als 2 Songs?"**

**Variante A — Tabellen-Subquery** (innen zählen, außen filtern):

```sql
SELECT t.label_name, t.n
FROM (
  SELECT l.name AS label_name, COUNT(*) AS n
  FROM label l JOIN kuenstler k ON k.label_id = l.id
               JOIN song s ON s.kuenstler_id = k.id
  GROUP BY l.id
) AS t
WHERE t.n > 2
ORDER BY t.n DESC;
```

**Variante B — JOIN mit `HAVING`** (alles in einer Abfrage):

```sql
SELECT l.name AS label_name, COUNT(*) AS n
FROM label l JOIN kuenstler k ON k.label_id = l.id
             JOIN song s ON s.kuenstler_id = k.id
GROUP BY l.id
HAVING COUNT(*) > 2
ORDER BY n DESC;
```

**Ergebnis beide:** Nordklang (4), Suedton (4) — identisch.

**Welche Form liest sich klarer?** Die JOIN-Variante ist kürzer (ein Statement,
`GROUP BY` + `HAVING` ist der Standardweg). Die Subquery-Variante macht die zwei
Schritte „erst zählen, dann filtern" explizit — das bleibt lesbarer, wenn der
äußere Filter wächst (z. B. zusätzlich nach Jahr filtern) oder die innere
Ergebnismenge zweimal gebraucht wird. Bei weiterer Verschachtelung wäre ohnehin
ein CTE (Ausblick KM5-04) die nächste Stufe.

## 4. Nachweis: Demo und Tests

`deno task demo` (im Projekt `km5-03-unterabfragen/`):

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

`deno task test`:

```text
running 4 tests from ./queries_test.ts
Skalar in WHERE: Songs über dem Durchschnitt ... ok
Skalar in SELECT: Durchschnittsspalte ist 212.5 ... ok
Tabelle in FROM: Künstler mit 2+ Songs ... ok
Zeile in WHERE: Auers längster Song ist Hafenlicht ... ok

ok | 4 passed | 0 failed
```

Zusätzlich wurde `unterabfragen.sql` mit der `sqlite3`-CLI gegen den Seed
gelesen (`sqlite3 db < seed-musik-mini.sql` + `.read unterabfragen.sql`) — alle
fünf Abfragen liefern die oben genannten Ergebnisse.

**Screenshots zum Nachreichen:** (1) `deno task demo`, (2) `deno task test` (4
grüne Tests), (3) optional die `sqlite3`-Ausgabe zu `unterabfragen.sql`.
