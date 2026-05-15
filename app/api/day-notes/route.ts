import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  const notes = await db.dayNote.findMany({ orderBy: { date: "asc" } });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Sense permisos" }, { status: 403 });

  const { date, note } = await req.json();
  if (!date) return NextResponse.json({ error: "Data requerida" }, { status: 400 });

  if (!note || !note.trim()) {
    await db.dayNote.deleteMany({ where: { date } });
    return NextResponse.json({ deleted: true });
  }

  const dayNote = await db.dayNote.upsert({
    where: { date },
    update: { note: note.trim() },
    create: { date, note: note.trim() },
  });

  return NextResponse.json(dayNote, { status: 201 });
}
