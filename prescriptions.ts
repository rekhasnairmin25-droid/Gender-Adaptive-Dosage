"use server"

import { CURRENT_DOCTOR_ID } from "@/lib/config"
import { db } from "@/lib/db"
import { activityLog, drug, prescription, symptomReport } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { warningFires } from "@/lib/warnings"

export type PrescriptionWithDrug = {
  prescription: typeof prescription.$inferSelect
  drug: typeof drug.$inferSelect
}

export async function getPrescriptionsForPatient(patientId: number) {
  return db
    .select({ prescription, drug })
    .from(prescription)
    .innerJoin(drug, eq(prescription.drugId, drug.id))
    .where(eq(prescription.patientId, patientId))
    .orderBy(desc(prescription.createdAt))
}

export type CreatePrescriptionInput = {
  patientId: number
  patientSex: string
  drugId: number
  dose?: string | null
  frequency?: string | null
  duration?: string | null
  overridden: boolean
  overrideReason?: string | null
}

export async function createPrescription(input: CreatePrescriptionInput) {
  const [selectedDrug] = await db.select().from(drug).where(eq(drug.id, input.drugId)).limit(1)
  if (!selectedDrug) throw new Error("Drug not found")

  const warningTriggered = warningFires(input.patientSex, selectedDrug.appliesToSex)

  // An override only means something when a warning actually fired.
  const overridden = warningTriggered && input.overridden

  const [created] = await db
    .insert(prescription)
    .values({
      patientId: input.patientId,
      doctorId: CURRENT_DOCTOR_ID,
      drugId: input.drugId,
      dose: input.dose?.trim() || null,
      frequency: input.frequency?.trim() || null,
      duration: input.duration?.trim() || null,
      warningTriggered,
      overridden,
      overrideReason: overridden ? input.overrideReason?.trim() || null : null,
    })
    .returning()

  await db.insert(activityLog).values({
    doctorId: CURRENT_DOCTOR_ID,
    actionType: "create_prescription",
    targetId: created.id,
    details: `Prescribed ${selectedDrug.name}${warningTriggered ? " (warning fired)" : ""}`,
  })

  if (overridden) {
    await db.insert(activityLog).values({
      doctorId: CURRENT_DOCTOR_ID,
      actionType: "override_warning",
      targetId: created.id,
      details: input.overrideReason?.trim()
        ? `Overrode warning for ${selectedDrug.name}: ${input.overrideReason.trim()}`
        : `Overrode warning for ${selectedDrug.name} (no reason given)`,
    })
  }

  revalidatePath(`/patients/${input.patientId}`)
  revalidatePath("/activity")
  return created
}

export async function getSymptomReports(prescriptionId: number) {
  return db
    .select()
    .from(symptomReport)
    .where(eq(symptomReport.prescriptionId, prescriptionId))
    .orderBy(desc(symptomReport.submittedAt))
}

export async function getSymptomReportsForPatient(patientId: number) {
  return db
    .select({ report: symptomReport, drugName: drug.name, prescriptionId: prescription.id })
    .from(symptomReport)
    .innerJoin(prescription, eq(symptomReport.prescriptionId, prescription.id))
    .innerJoin(drug, eq(prescription.drugId, drug.id))
    .where(eq(prescription.patientId, patientId))
    .orderBy(desc(symptomReport.submittedAt))
}

export async function addSymptomReport(input: {
  prescriptionId: number
  patientId: number
  text: string
}) {
  const text = input.text?.trim()
  if (!text) throw new Error("Symptom text is required")

  const [created] = await db
    .insert(symptomReport)
    .values({
      prescriptionId: input.prescriptionId,
      patientSubmittedText: text,
      source: "doctor",
    })
    .returning()

  await db.insert(activityLog).values({
    doctorId: CURRENT_DOCTOR_ID,
    actionType: "add_symptom_report",
    targetId: input.prescriptionId,
    details: `Recorded reported effects for prescription #${input.prescriptionId}`,
  })

  revalidatePath(`/patients/${input.patientId}`)
  return created
}
