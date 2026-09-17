export type DigitalRequestFollowUpGateInput = {
  patient_reference?: string | null;
  new_patient_exception_confirmed_at?: Date | null;
};

export function hasDigitalRequestFollowUpGate(
  request: DigitalRequestFollowUpGateInput,
): boolean {
  return (
    (typeof request.patient_reference === "string" &&
      request.patient_reference.trim().length > 0) ||
    request.new_patient_exception_confirmed_at != null
  );
}