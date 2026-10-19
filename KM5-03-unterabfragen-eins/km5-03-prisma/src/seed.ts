// src/seed.ts — dieselbe Mini-Musik-DB wie seed-musik-mini.sql aus dem
// Beispielprojekt (3 Labels, 6 Kuenstler, Frei ohne Label, 10 Songs).
// Idempotent: erst leeren, dann neu anlegen. Reihenfolge wegen Fremdschlüsseln.
import { prisma } from "./db.ts";

declare const process: {
  argv: string[];
  exit(code?: number): never;
};

async function main() {
  await prisma.song.deleteMany();
  await prisma.kuenstler.deleteMany();
  await prisma.label.deleteMany();

  await prisma.label.createMany({
    data: [{ name: "Nordklang" }, { name: "Suedton" }, { name: "Westbeat" }],
  });
  const nord = await prisma.label.findUniqueOrThrow({ where: { name: "Nordklang" } });
  const sued = await prisma.label.findUniqueOrThrow({ where: { name: "Suedton" } });

  await prisma.kuenstler.createMany({
    data: [
      { name: "Auer", labelId: nord.id },
      { name: "Beck", labelId: nord.id },
      { name: "Cevik", labelId: sued.id },
      { name: "Demir", labelId: sued.id },
      { name: "Egger", labelId: sued.id },
      { name: "Frei", labelId: null }, // Independent, kein Label
    ],
  });
  const auer = await prisma.kuenstler.findFirstOrThrow({ where: { name: "Auer" } });
  const beck = await prisma.kuenstler.findFirstOrThrow({ where: { name: "Beck" } });
  const cevik = await prisma.kuenstler.findFirstOrThrow({ where: { name: "Cevik" } });
  const demir = await prisma.kuenstler.findFirstOrThrow({ where: { name: "Demir" } });
  const egger = await prisma.kuenstler.findFirstOrThrow({ where: { name: "Egger" } });
  const frei = await prisma.kuenstler.findFirstOrThrow({ where: { name: "Frei" } });

  await prisma.song.createMany({
    data: [
      { titel: "Silent Lines", dauerSek: 210, kuenstlerId: auer.id },
      { titel: "Night Ferry", dauerSek: 185, kuenstlerId: auer.id },
      { titel: "Hafenlicht", dauerSek: 240, kuenstlerId: auer.id },
      { titel: "Kalter Kaffee", dauerSek: 200, kuenstlerId: beck.id },
      { titel: "Dust Choir", dauerSek: 230, kuenstlerId: cevik.id },
      { titel: "Bergwind", dauerSek: 195, kuenstlerId: demir.id },
      { titel: "TalEcho", dauerSek: 220, kuenstlerId: demir.id },
      { titel: "Suedhang", dauerSek: 205, kuenstlerId: egger.id },
      { titel: "Freies Feld", dauerSek: 250, kuenstlerId: frei.id },
      { titel: "Ohne Netz", dauerSek: 190, kuenstlerId: frei.id },
    ],
  });

  console.log(
    `Seed: ${await prisma.label.count()} Labels, ${await prisma.kuenstler.count()} Kuenstler, ${await prisma.song.count()} Songs.`,
  );
}

// Nur ausführen, wenn die Datei direkt gestartet wird (nicht beim Import im Test).
const entrypoint = process.argv[1] ?? "";
if (entrypoint.endsWith("seed.ts")) {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
