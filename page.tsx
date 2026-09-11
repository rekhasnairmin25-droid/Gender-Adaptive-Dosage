import { getPatients } from "@/app/actions/patients"
import { AppHeader } from "@/components/app-header"
import { DisclaimerBanner } from "@/components/disclaimer-banner"
import { PatientList } from "@/components/patient-list"
import { NewPatientForm } from "@/components/new-patient-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DashboardPage() {
  const patients = await getPatients()

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a patient to review their record and prescribe with sex-based dosing checks.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section aria-label="Patient list" className="order-2 lg:order-1">
            <PatientList patients={patients} />
          </section>

          <aside className="order-1 flex flex-col gap-4 lg:order-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add a patient</CardTitle>
              </CardHeader>
              <CardContent>
                <NewPatientForm />
              </CardContent>
            </Card>
            <DisclaimerBanner />
          </aside>
        </div>
      </main>
    </div>
  )
}
