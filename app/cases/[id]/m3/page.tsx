export default async function M3Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "700px" }}>
      <h1>M3 – Ärztliche Checkliste</h1>
      <p>Fall: {id}</p>
    </main>
  );
}
