import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = "HCV2026";

// New users not yet in the DB
const NEW_USERS = [
  { name: "Emilia",   email: "emilia@hcv.cat",    color: "#BE185D", initials: "EM" },
  { name: "Emma",     email: "emma@hcv.cat",       color: "#0891B2", initials: "EM" },
  { name: "Pau",      email: "pau@hcv.cat",         color: "#65A30D", initials: "PA" },
  { name: "Yajaira",  email: "yajaira@hcv.cat",    color: "#DC2626", initials: "YA" },
  { name: "Hadiyi",   email: "hadiyi@hcv.cat",     color: "#7C3AED", initials: "HA" },
  { name: "Nicole",   email: "nicole@hcv.cat",     color: "#D97706", initials: "NI" },
  { name: "Maribel S",email: "maribel.s@hcv.cat",  color: "#059669", initials: "MS" },
  { name: "Sara",     email: "sara@hcv.cat",        color: "#9333EA", initials: "SA" },
  { name: "Valeria",  email: "valeria@hcv.cat",    color: "#B45309", initials: "VA" },
  { name: "Alberto",  email: "alberto@hcv.cat",    color: "#0369A1", initials: "AL" },
  { name: "Salma",    email: "salma@hcv.cat",       color: "#BE123C", initials: "SL" },
  { name: "Steffi",   email: "steffi@hcv.cat",     color: "#0F766E", initials: "ST" },
  { name: "Tamara",   email: "tamara@hcv.cat",     color: "#A21CAF", initials: "TA" },
  { name: "Oscar",    email: "oscar@hcv.cat",       color: "#B45309", initials: "OS" },
];

// Name → email mapping for all users appearing in the schedule
const NAME_TO_EMAIL: Record<string, string> = {
  "Neus":       "neus.plaza@hcv.cat",
  "Berta Gau":  "berta.gauthier@hcv.cat",
  "Montse":     "montse.prieto@hcv.cat",
  "Judith H":   "judith.hernandez@hcv.cat",
  "Ana":        "ana.otero@hcv.cat",
  "Andrea":     "andrea@hcv.cat",
  "Geoconda":   "geoconda@hcv.cat",
  "Paula":      "paula@hcv.cat",
  "Marta P":    "marta.p@hcv.cat",
  "Sofia":      "sofia@hcv.cat",
  "Emilia":     "emilia@hcv.cat",
  "Emma":       "emma@hcv.cat",
  "Pau":        "pau@hcv.cat",
  "Yajaira":    "yajaira@hcv.cat",
  "Hadiyi":     "hadiyi@hcv.cat",
  "Nicole":     "nicole@hcv.cat",
  "Maribel S":  "maribel.s@hcv.cat",
  "Sara":       "sara@hcv.cat",
  "Valeria":    "valeria@hcv.cat",
  "Alberto":    "alberto@hcv.cat",
  "Salma":      "salma@hcv.cat",
  "Steffi":     "steffi@hcv.cat",
  "Tamara":     "tamara@hcv.cat",
  "Oscar":      "oscar@hcv.cat",
};

async function main() {
  console.log("🌱 Seed posicions iniciant...");

  // ── Afegir nous usuaris ──
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  for (const u of NEW_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: hash, role: "AUXILIAR", guardia: false },
    });
  }
  console.log(`✅ ${NEW_USERS.length} nous usuaris creats/verificats`);

  // ── Construir mapa email → id ──
  const allUsers = await prisma.user.findMany({ select: { id: true, email: true } });
  const emailToId: Record<string, number> = {};
  allUsers.forEach(u => { emailToId[u.email] = u.id; });

  // ── Llegir dades de posicions ──
  const dataPath = path.join(__dirname, "positions_data.json");
  const rawData: { date: string; positionId: string; name: string | null }[] =
    JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  // ── Inserir assignacions ──
  let inserted = 0;
  let skipped = 0;

  for (const row of rawData) {
    const { date, positionId, name } = row;
    let userId: number | null = null;

    if (name !== null) {
      const email = NAME_TO_EMAIL[name];
      if (!email) {
        console.warn(`⚠️  Nom desconegut: "${name}" (${date} ${positionId})`);
        skipped++;
        continue;
      }
      userId = emailToId[email] ?? null;
      if (!userId) {
        console.warn(`⚠️  Usuari no trobat per email: "${email}"`);
        skipped++;
        continue;
      }
    }

    await prisma.positionAssignment.upsert({
      where: { date_positionId: { date, positionId } },
      update: { userId },
      create: { date, positionId, userId },
    });
    inserted++;
  }

  console.log(`✅ ${inserted} assignacions inserides`);
  if (skipped > 0) console.log(`⚠️  ${skipped} files omeses`);
  console.log("\n🎉 Seed de posicions completat!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
