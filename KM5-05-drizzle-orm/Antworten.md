# Antworten KM5-05 — Drizzle ORM (typsicherer Datenbankzugriff)

Abgabe wie gefordert: **Markdown + der geänderte `demo.ts`**
([`km5-05-drizzle-orm/demo.ts`](./km5-05-drizzle-orm/demo.ts), Abschnitt
„Aufgabe KM5-05: drei ergänzte Queries").

## 0. Setup: Drizzle unter Deno (kein Node, kein npm install)

Abhängigkeit liegt **nur in `deno.json`** — Deno lädt das npm-Paket selbst:

```json
"nodeModulesDir": "none",
"imports": {
  "drizzle-orm": "npm:drizzle-orm@1.0.0-rc.4",
  "@std/assert": "jsr:@std/assert@1"
}
```

- kein `package.json`, kein `npm install`, kein `node_modules` (via `.gitignore`
  abgesichert)
- Treiber: `node:sqlite` (`DatabaseSync`) + `drizzle-orm/node-sqlite`,
  Verbindung **`drizzle({ client })`**
- Version gepinnt (`1.0.0-rc.4`), `deno.lock` mitgegeben → reproduzierbar

## 1. Vorhersage der zwei Queries (vor dem Ausführen notiert, dann mit `toSQL()` geprüft)

**a)** `db.select().from(artist).where(eq(artist.gruendungsjahr, 1999))`

```sql
select "id", "name", "gruendungsjahr" from "artist" where "artist"."gruendungsjahr" = ?
-- params: [ 1999 ]
```

Vorhersage: Spalten werden **explizit** in der Reihenfolge der Schema-Definition
aufgelistet (auch bei `select()` ohne Argumente), der Wert steht **nicht** im
SQL-Text, sondern als Parameter. Stimmt exakt mit `toSQL()` überein.

**b)** `db.select({ n: count() }).from(album).where(eq(album.artistId, 1))`

```sql
select count(*) from "album" where "album"."artist_id" = ?
-- params: [ 1 ]
```

Vorhersage: nur die Aggregation, **keine Stern-Spalte**, der Alias `n` ist
TS-seitig (Ergebnisobjekt `{ n: ... }`), im SQL-Text bleibt es `count(*)`;
`album.artistId` → DB-Spalte `artist_id`, Wert als Parameter. Stimmt exakt mit
`toSQL()` überein.

## 2. Drei ergänzte Queries in `demo.ts`

| # | Query                                      | Bausteine                                               | Ergebnis im Demo-Lauf                      |
| - | ------------------------------------------ | ------------------------------------------------------- | ------------------------------------------ |
| 1 | ältestes Album                             | `orderBy(asc(album.jahr))` + `limit(1)`                 | `Night Ferry ( 2012 )`                     |
| 2 | Tracks eines Albums mit Titelbeginn „Echo“ | `and(eq(track.albumId, …), like(track.titel, "Echo%"))` | `[ { titel: "Echo Room", dauer: 187 } ]`   |
| 3 | Anzahl Tracks je Album                     | `count()` + `innerJoin` + `groupBy(album.id)`           | `[ { titel: "Silent Lines", tracks: 2 } ]` |

Erzeugtes SQL aus der Demo:

```text
Echo-Tracks, erzeugtes SQL: select "titel", "dauer_sek" from "track" where (("track"."album_id" = ?) and ("track"."titel" like ?))
Echo-Tracks, Parameter: [ 1, "Echo%" ]
Tracks je Album, erzeugtes SQL: select "album"."titel", count(*) from "track" inner join "album" on "track"."album_id" = "album"."id" group by "album"."id"
Tracks je Album, Parameter: []
```

Zwei Beobachtungen: Der `like`-Wert `"Echo%"` landet als **Parameter**, nicht im
SQL-Text; `count()` ohne Argument wird zu `count(*)`, die Spalte `n`/`tracks`
ist nur der TS-Name im Ergebnisobjekt.

## 3. SQL-Vergleich (Interleaving): „Tracks pro Album“

**Drizzle** (Query-Builder) →

```ts
db.select({ titel: album.titel, tracks: count() })
  .from(track)
  .innerJoin(album, eq(track.albumId, album.id))
  .groupBy(album.id);
```

**erzeugtes SQL** (mit Markierung der Bausteine):

```sql
select "album"."titel", count(*)                 -- COUNT
  from "track"
  inner join "album" on "track"."album_id" = "album"."id"   -- JOIN ... ON
  group by "album"."id"                                    -- GROUP BY
```

**dieselbe Frage als reines SQL** (in `demo.ts` über `db.$client` ausgeführt):

```sql
SELECT a.titel AS titel, COUNT(*) AS tracks
FROM track t JOIN album a ON t.album_id = a.id
GROUP BY a.id;
```

**Vergleich:** Identische Bausteine — `JOIN … ON`, `COUNT(*)`, `GROUP BY a.id`;
beide liefern `[ { titel: "Silent Lines", tracks: 2 } ]`. Unterschiede: Drizzle
listet die Spalten explizit auf („album“.titel statt `a.titel`), schreibt den
`AS`-Alias der Ergebnisspalte nur im Ergebnisobjekt (nicht ins SQL) und
parametrisiert alle Werte (`toSQL().params`). Das rohe SQL liest sich kürzer und
bleibt bei Aggregations-/Subquery-Magie (KM5-03) die mächtigere Variante.

## 4. Nachweis: Demo und Tests

`deno task demo` (gekürzt auf die Aufgaben-Ausgaben):

```text
Lesen, erzeugtes SQL: select "id", "titel", "jahr", "artist_id" from "album" where "album"."artist_id" = ?
Lesen, Parameter: [ 1 ]
Neuestes Album: Silent Lines ( 2015 )
Ältestes Album: Night Ferry ( 2012 )
Echo-Tracks, erzeugtes SQL: select "titel", "dauer_sek" from "track" where (("track"."album_id" = ?) and ("track"."titel" like ?))
Echo-Tracks, Parameter: [ 1, "Echo%" ]
Echo-Tracks, Ergebnis: [ { titel: "Echo Room", dauer: 187 } ]
Tracks je Album, erzeugtes SQL: select "album"."titel", count(*) from "track" inner join "album" on "track"."album_id" = "album"."id" group by "album"."id"
Tracks je Album (Drizzle): [ { titel: "Silent Lines", tracks: 2 } ]
Tracks je Album (rohes SQL): [ { titel: "Silent Lines", tracks: 2 } ]
Nach update: 220 Sekunden
Tracks nach delete: 1
```

`deno task test`:

```text
running 9 tests from ./demo_test.ts
insert mit returning liefert die neue Zeile mit id ... ok
select mit where filtert typsicher ... ok
Fremdschlüssel verhindert Album ohne Artist ... ok
update aendert nur die gewaehlten Zeilen ... ok
delete entfernt nur die gewaehlte Zeile ... ok
orderBy + limit liefern das juengste Album ... ok
innerJoin verbindet Album und Artist ... ok
Drizzle parametrisiert: Werte stecken in params, nicht im SQL ... ok
assertThrows ist importiert und steht bereit ... ok

ok | 9 passed | 0 failed
```

`deno lint demo.ts` → `Checked 1 file` ohne Befund.

**Screenshots zum Nachreichen:** (1) `deno task demo` inkl. `toSQL()`-Zeilen,
(2) `deno task test` mit den 9 grünen Tests, (3) optional der Abschnitt „Aufgabe
KM5-05“ in `demo.ts` im Editor.
