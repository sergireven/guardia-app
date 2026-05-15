import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Sense permisos" }, { status: 403 });

  const { status, dates } = await req.json();
  const vacation = await db.vacation.update({
    where: { id: parseInt(params.id) },
    data: { ...(status && { status }), ...(dates && { dates }) },
  });
  return NextResponse.json(vacation);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Sense permisos" }, { status: 403 });

  await db.vacation.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ ok: true });
}
