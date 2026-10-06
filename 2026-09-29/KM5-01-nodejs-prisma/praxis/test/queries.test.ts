// test/queries.test.ts — Node-Testrunner über tsx (eingebaut, kein Test-Framework nötig).
// Voraussetzung: npm run db:seed (die Tests lesen dev.db).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/db.ts";
import {
  kuenstlerMitUndOhneLabel,
  labelPaare,
  langeSongs,
  topKuenstler,
  volleLabels,
} from "../src/queries.ts";
import { playlistSongAnzahl } from "../src/playlist.ts";

before(async () => {
  assert.ok((await prisma.song.count()) > 0, "Bitte zuerst `npm run db:seed` ausführen.");
});

after(async () => {
  await prisma.$disconnect();
});

test("Top-Künstler liefert absteigend nach Track-Anzahl", async () => {
  const top = await topKuenstler();
  assert.equal(top[0].name, "Nova");
  assert.equal(top[0].tracks, 3);
});

test("COUNT(*) zählt auch Künstler ohne Label", async () => {
  const { alle, mitLabel } = await kuenstlerMitUndOhneLabel();
  assert.equal(alle, 4);
  assert.equal(mitLabel, 3);
});

test("Volle Labels: nur Ohrwurm Records hat 2 Künstler", async () => {
  const labels = await volleLabels();
  assert.deepEqual(labels, [{ name: "Ohrwurm Records", anzahl: 2 }]);
});

test("Label-Paare (Self-JOIN über $queryRaw) findet Nova/Pixel", async () => {
  const paare = await labelPaare();
  assert.equal(paare.length, 1);
  assert.equal(paare[0].label, "Ohrwurm Records");
});

test("WHERE + HAVING: Nova und Pixel haben je 2+ Songs über 200 s", async () => {
  const lang = await langeSongs();
  assert.deepEqual(lang.map((l) => l.name).sort(), ["Nova", "Pixel"]);
});

test("Playlist zählt pro Playlist die Songs (eine Abfrage)", async () => {
  const playlists = await playlistSongAnzahl();
  assert.deepEqual(playlists, [
    { playlist: "Fokus", songs: 3 },
    { playlist: "Ruhe", songs: 1 },
  ]);
});
