import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import GuardiaApp from "@/components/GuardiaApp";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Carregar totes les dades inicials server-side per a hidratació ràpida
  const [users, guardias, vacations, requests, holidays, positions, assignments, dayNotes] = await Promise.all([
    db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id:true, name:true, email:true, color:true, initials:true, role:true, guardia:true, active:true } }),
    db.guardia.findMany({ orderBy: { satDate: "asc" } }),
    db.vacation.findMany({ orderBy: { createdAt: "desc" } }).then(vs => vs.map(v => ({ ...v, comment: v.comment ?? undefined }))),
    db.request.findMany({ orderBy: { createdAt: "desc" } }).then(rs => rs.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), comment: r.comment ?? undefined }))),
    db.holiday.findMany({ orderBy: { date: "asc" } }),
    db.position.findMany({ orderBy: { displayOrder: "asc" } }),
    db.positionAssignment.findMany({ include: { user: { select: { id:true, name:true, color:true, initials:true } }, subUser: { select: { id:true, name:true, color:true, initials:true } } } }),
    db.dayNote.findMany({ orderBy: { date: "asc" } }),
  ]);

  return (
    <GuardiaApp
      initialData={{ users, guardias, vacations, requests, holidays, positions, assignments, dayNotes }}
      currentUser={{
        id: parseInt(session.user.id!),
        name: session.user.name!,
        email: session.user.email!,
        role: (session.user as any).role,
        color: (session.user as any).color,
        initials: (session.user as any).initials,
        guardia: (session.user as any).guardia,
      }}
    />
  );
}
