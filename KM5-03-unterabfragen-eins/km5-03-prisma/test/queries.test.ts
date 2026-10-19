// test/queries.test.ts — Node-Testrunner über tsx (eingebaut, kein Framework nötig).
// Voraussetzung: npm run db:seed (die Tests lesen dev.db).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/db.ts";
import {
  auerUeberSchnitt,
  durchschnittsSongs,
  durchschnittsSongsPrisma,
  labelsJoinHaving,
  labelsMitMehrAls2Songs,
  labelsMitMehrAls2SongsPrisma,
  laengsterSongFrei,
} from "../src/queries.ts";

before(async () => {
  assert.ok((await prisma.song.count()) > 0, "Bitte zuerst `npm run db:seed` ausführen.");
});

after(async () => {
  await prisma.$disconnect();
});

test("Vorhersage: 4 Songs über dem Durchschnitt (212.5)", async () => {
  const rows = await durchschnittsSongs();
  assert.deepEqual(
    rows.map((r) => r.titel),
    ["Freies Feld", "Hafenlicht", "Dust Choir", "TalEcho"],
  );
});

test("Prisma-API liefert dieselben Songs wie die Subquery", async () => {
  const roh = await durchschnittsSongs();
  const api = await durchschnittsSongsPrisma();
  assert.deepEqual(api, roh);
});

test("Skalar in WHERE: nur Hafenlicht liegt über dem Schnitt", async () => {
  const rows = await auerUeberSchnitt();
  assert.deepEqual(rows, [{ titel: "Hafenlicht", dauerSek: 240 }]);
});

test("Tabellen-Subquery: Nordklang und Suedton je 4 Songs", async () => {
  const rows = await labelsMitMehrAls2Songs();
  assert.deepEqual(rows, [
    { name: "Nordklang", n: 4 },
    { name: "Suedton", n: 4 },
  ]);
});

test("Zeilen-Subquery: Freis längster Song ist Freies Feld", async () => {
  const row = await laengsterSongFrei();
  assert.equal(row.titel, "Freies Feld");
  assert.equal(row.dauerSek, 250);
  assert.equal(row.kuenstlerId, 6);
});

test("Interleaving: JOIN+HAVING liefert dasselbe wie die Subquery", async () => {
  assert.deepEqual(await labelsJoinHaving(), await labelsMitMehrAls2Songs());
});

test("Prisma-API-Variante des Label-Filters liefert dasselbe Ergebnis", async () => {
  assert.deepEqual(await labelsMitMehrAls2SongsPrisma(), await labelsMitMehrAls2Songs());
});
