"use server"

import { CURRENT_DOCTOR_ID } from "@/lib/config"
import { db } from "@/lib/db"
import { activityLog } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"

export async function getActivityLog(limit = 100) {
  return db
    .select()
    .from(activityLog)
    .where(eq(activityLog.doctorId, CURRENT_DOCTOR_ID))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)
}
