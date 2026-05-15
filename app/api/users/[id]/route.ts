import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Sense permisos" }, { status: 403 });

  const id = parseInt(params.id);
  const body = await req.json();
  const { name, color, initials, role, guardia, active } = body;

  const user = await db.user.update({
    where: { id },
    data: { ...(name && { name }), ...(color && { color }), ...(initials && { initials }), ...(role && { role }), ...(guardia !== undefined && { guardia }), ...(active !== undefined && { active }) },
    select: { id:true, name:true, email:true, color:true, initials:true, role:true, guardia:true, active:true },
  });

  return NextResponse.json(user);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Sense permisos" }, { status: 403 });

  await db.user.update({ where: { id: parseInt(params.id) }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
