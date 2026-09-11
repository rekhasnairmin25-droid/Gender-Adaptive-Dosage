"use server"

import { CURRENT_DOCTOR_ID } from "@/lib/config"
import { db } from "@/lib/db"
import { activityLog, patient } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function getPatients() {
  return db.select().from(patient).orderBy(desc(patient.createdAt))
}

export async function getPatient(id: number) {
  const [row] = await db.select().from(patient).where(eq(patient.id, id)).limit(1)
  return row ?? null
}

export type CreatePatientInput = {
  name: string
  dateOfBirth?: string | null
  sex: string
  weightKg?: string | null
  heightCm?: string | null
  knownConditions?: string | null
}

export async function createPatient(input: CreatePatientInput) {
  const name = input.name?.trim()
  if (!name) throw new Error("Patient name is required")
  if (!input.sex) throw new Error("Patient sex is required")

  const [created] = await db
    .insert(patient)
    .values({
      name,
      dateOfBirth: input.dateOfBirth || null,
      sex: input.sex,
      weightKg: input.weightKg || null,
      heightCm: input.heightCm || null,
      knownConditions: input.knownConditions?.trim() || null,
      createdByDoctorId: CURRENT_DOCTOR_ID,
    })
    .returning()

  await db.insert(activityLog).values({
    doctorId: CURRENT_DOCTOR_ID,
    actionType: "create_patient",
    targetId: created.id,
    details: `Created patient ${created.name}`,
  })

  revalidatePath("/")
  return created
}
