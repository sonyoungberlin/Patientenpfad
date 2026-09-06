export function PatientReferenceSummary({
  reference,
}: {
  reference: string | null | undefined;
}) {
  const patientId = reference?.trim();
  if (!patientId) return null;

  return (
    <section data-patient-reference style={{ marginTop: "1.5rem" }}>
      <h2 style={{ fontSize: "1.1rem" }}>Ihre Patienten-ID</h2>
      <p data-patient-reference-value>{patientId}</p>
    </section>
  );
}