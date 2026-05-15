import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  const guardias = await db.guardia.findMany({ orderBy: { satDate: "asc" } });
  return NextResponse.json(guardias);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Sense permisos" }, { status: 403 });

  const { userId, satDate } = await req.json();
  if (!userId || !satDate) return NextResponse.json({ error: "userId i satDate obligatoris" }, { status: 400 });

  // Si ja existeix una guàrdia en aquest dissabte, actualitza l'assignació
  const guardia = await db.guardia.upsert({
    where: { satDate },
    update: { userId: parseInt(userId) },
    create: { userId: parseInt(userId), satDate },
  });

  return NextResponse.json(guardia, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Sense permisos" }, { status: 403 });

  const { satDate } = await req.json();
  await db.guardia.deleteMany({ where: { satDate } });
  return NextResponse.json({ ok: true });
}
