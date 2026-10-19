-- unterabfragen.sql — Aufgabe KM5-03: Unterabfragen I (Skalar, Zeile, Tabelle)
-- Abgabe: eine SQL-Datei, je Abfrage ein Kommentar.
-- Ausführen (Musik-Mini-DB als In-Memory-DB):
--   sqlite3 :memory: ".read km5-03-unterabfragen/seed-musik-mini.sql" ".read unterabfragen.sql"
-- oder mit der Datei-DB:
--   sqlite3 musik.db < km5-03-unterabfragen/seed-musik-mini.sql
--   sqlite3 musik.db ".read unterabfragen.sql"

-- 1) VORHERSAGE (notiert vor dem Ausführen): Der Durchschnitt aller Song-Dauern ist
--    212.5 (Summe 2125 / 10 Songs) — geliefert werden nur die Songs mit dauer_sek > 212.5,
--    also genau 4 Zeilen: Freies Feld (250), Hafenlicht (240), Dust Choir (230), TalEcho (220).
--    Sortiert nach Dauer absteigend; kürzere Songs (210, 205, 200, 195, 190, 185) fehlen.
SELECT titel, dauer_sek
FROM song
WHERE dauer_sek > (SELECT AVG(dauer_sek) FROM song)
ORDER BY dauer_sek DESC;

-- 2a) SKALAR-SUBQUERY in WHERE: liefert genau einen Wert (den Gesamtdurchschnitt 212.5),
--     gegen den jede Zeile der Außenabfrage verglichen wird — hier nur Auers Songs,
--     Ergebnis: Hafenlicht (240); Silent Lines (210) und Night Ferry (185) liegen darunter.
SELECT titel, dauer_sek
FROM song
WHERE kuenstler_id = 1
  AND dauer_sek > (SELECT AVG(dauer_sek) FROM song);

-- 2b) TABELLEN-SUBQUERY in FROM (abgeleitete Tabelle, Alias in SQLite Pflicht):
--     erst innen pro Label gezählt, dann außen auf mehr als 2 Songs gefiltert.
SELECT t.label_name, t.n
FROM (
  SELECT l.name AS label_name, COUNT(*) AS n
  FROM label l
  JOIN kuenstler k ON k.label_id = l.id
  JOIN song s ON s.kuenstler_id = k.id
  GROUP BY l.id
) AS t
WHERE t.n > 2
ORDER BY t.n DESC;

-- 2c) ZEILEN-SUBQUERY (Tupelvergleich): der längste Song des Künstlers "Frei" —
--     kuenstler_id UND dauer_sek werden in einem Schritt verglichen.
SELECT titel, dauer_sek
FROM song
WHERE (kuenstler_id, dauer_sek) =
      (SELECT kuenstler_id, MAX(dauer_sek) FROM song WHERE kuenstler_id = 6);

-- 3) INTERLEAVING, dieselbe Frage ("Labels mit mehr als 2 Songs") einmal als
--    Tabellen-Subquery (oben 2b) und einmal als JOIN mit HAVING — gleiche Ergebnisse.
SELECT l.name AS label_name, COUNT(*) AS n
FROM label l
JOIN kuenstler k ON k.label_id = l.id
JOIN song s ON s.kuenstler_id = k.id
GROUP BY l.id
HAVING COUNT(*) > 2
ORDER BY n DESC;

-- Vergleich: Die JOIN-Variante bringt Gruppieren und Filtern in einer Abfrage
-- (GROUP BY + HAVING) und liest sich kürzer; die Subquery-Variante trennt die Schritte
-- sichtbar (innen zählen, außen filtern) und bleibt bei weiteren Filtern übersichtlicher.
-- Beide liefern Nordklang (4) und Suedton (4) — Westbeat hat keine Songs und fällt
-- durch den Filter > 2 heraus.
