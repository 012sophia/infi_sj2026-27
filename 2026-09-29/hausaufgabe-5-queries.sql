-- ============================================================================
-- Hausübung UE 1b (3AHWII INFI, 2026-09-29) — 5 Auffrischungs-Queries
-- Quelle: lessons/0001-wiederholung-diagnose.html §4
-- DB:     seed-musik-mini.sql aus GRG-INFI/3ahwii/2026-09-29_rep-ohne-node/
--
-- Anlegen und ausführen:
--   sqlite3 musik-mini.db < seed-musik-mini.sql
--   sqlite3 -header -column musik-mini.db < hausaufgabe-5-queries.sql
--
-- Schema (Mini-Musik-DB):
--   label(id, name)                 3 Labels
--   kuenstler(id, name, label_id)   6 Künstler, davon 1 ohne Label (NULL)
--   song(id, titel, dauer_sek, kuenstler_id)  10 Songs
-- ============================================================================


-- ① Top-5-Künstler nach Track-Anzahl
--    Beantwortet: Welche Künstler haben die meisten Songs in der DB?
--    JOIN + GROUP BY + ORDER BY ... DESC + LIMIT
--    Die zweite Sortierangabe (k.name) ist nur ein Tie-Break, damit die
--    Ausgabe bei Gleichstand deterministisch ist.
--    Erwartet: Auer 3 | Demir 2 | Frei 2 | Beck 1 | Cevik 1
SELECT k.name AS kuenstler,
       COUNT(*) AS tracks
FROM kuenstler k
JOIN song s ON s.kuenstler_id = k.id
GROUP BY k.id, k.name
ORDER BY tracks DESC, k.name ASC
LIMIT 5;


-- ② Künstlerpaare desselben Labels
--    Beantwortet: Welche Künstler teilen sich ein Label?
--    Self-JOIN: x und y sind zwei Aliase derselben Tabelle kuenstler.
--    Die Bedingung x.id < y.id verhindert Doppelpaare (Auer-Beck faellt sonst
--    zweimal: einmal als x, einmal als y) und legt zugleich die Reihenfolge fest.
--    Erwartet: 4 Zeilen — Auer/Beck (Nordklang) + 3 Paare aus Suedton
--              (Cevik/Demir, Cevik/Egger, Demir/Egger)
SELECT x.name AS a,
       y.name AS b,
       l.name AS label
FROM kuenstler x
JOIN kuenstler y ON x.label_id = y.label_id AND x.id < y.id
JOIN label l ON l.id = x.label_id
ORDER BY l.name, a, b;


-- ③ Labels mit mehr als 5 Künstlern
--    Beantwortet: Welche Labels haben mehr als 5 Künstler?
--    HAVING filtert GROUPS (Ergebnisse der Gruppierung), WHERE filtert ZEILEN
--    davor — deshalb steht COUNT(...) > 5 zwingend in HAVING und nicht in WHERE.
--    Erwartet: 0 Zeilen — im Mini-Seed hat das größte Label nur 3 Künstler.
--    (Die Abfrage ist trotzdem korrekt; Schwelle auf 2 senken liefert Suedton,
--    auf 1 liefert Nordklang und Suedton.)
SELECT l.name AS label,
       COUNT(*) AS kuenstler_anzahl
FROM kuenstler k
JOIN label l ON l.id = k.label_id
GROUP BY l.id, l.name
HAVING COUNT(*) > 5
ORDER BY kuenstler_anzahl DESC, l.name;


-- ④ COUNT(*) vs. COUNT(label_id)
--    Beantwortet: Wie viele Künstler gibt es insgesamt, wie viele davon mit Label?
--    Erklärung: COUNT(*) zählt jede Zeile, also auch die, in der label_id NULL
--    ist. COUNT(label_id) zählt nur Zeilen mit einem Wert in dieser Spalte und
--    überspringt NULL. Die Differenz 6 zu 5 ist genau der Künstler "Frei",
--    der als Independent ohne Label in der DB steht.
--    Erwartet: alle = 6 | mit_label = 5
SELECT COUNT(*) AS alle,
       COUNT(label_id) AS mit_label
FROM kuenstler;


-- ⑤ WHERE und HAVING kombiniert
--    Beantwortet: Welche Künstler haben mindestens 2 Songs länger als 200 Sekunden?
--    WHERE filtert Zeilen VOR der Gruppierung (nur lange Songs bleiben),
--    HAVING filtert die Gruppen DANACH (mindestens 2 davon).
--    Erwartet: Auer 2
SELECT k.name AS kuenstler,
       COUNT(*) AS lange_songs
FROM kuenstler k
JOIN song s ON s.kuenstler_id = k.id
WHERE s.dauer_sek > 200
GROUP BY k.id, k.name
HAVING COUNT(*) >= 2
ORDER BY lange_songs DESC, k.name;

// zu Aufgabe 6: 
// Ich war leider am 29.9 nicht da, weil ich krank war, aber soweit ich
//das  verstanden habe, wurde müsste man prisma mit einem Zusätzlichen
//Adapter installieren, aber mit node und npm hat das besser funktioniert.