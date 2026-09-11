"use server"

import { db } from "@/lib/db"
import { drug } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"

export async function getDrugs() {
  return db.select().from(drug).orderBy(asc(drug.name))
}

export async function getDrug(id: number) {
  const [row] = await db.select().from(drug).where(eq(drug.id, id)).limit(1)
  return row ?? null
}
