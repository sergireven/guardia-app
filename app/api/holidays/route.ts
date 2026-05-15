import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// ── GET tots els festius
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  const holidays = await db.holiday.findMany({ orderBy: { date: "asc" } });
  return NextResponse.json(holidays);
}

// ── POST afegir festiu (admin)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Sense permisos" }, { status: 403 });

  const { date, name } = await req.json();
  const holiday = await db.holiday.upsert({ where: { date }, update: { name }, create: { date, name } });
  return NextResponse.json(holiday, { status: 201 });
}

// ── DELETE eliminar festiu (admin)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Sense permisos" }, { status: 403 });

  const { date } = await req.json();
  await db.holiday.deleteMany({ where: { date } });
  return NextResponse.json({ ok: true });
}
