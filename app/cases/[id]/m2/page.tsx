import { buildCaseM3Path } from "@/lib/flow/caseNavigation";

export default async function M2Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m3Path = buildCaseM3Path(id);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "700px" }}>
      <h1>M2 – Patienteninformationen</h1>
      <p>Hier können die M2-Angaben wie vorgesehen erfasst werden.</p>
      <a href={m3Path} style={{ display: "inline-block", marginTop: "1rem" }}>
        Ohne M2 direkt zur ärztlichen Checkliste
      </a>
    </main>
  );
}
