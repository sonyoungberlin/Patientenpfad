export default function M3Page({ params }: { params: { id: string } }) {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "700px" }}>
      <h1>M3 – Ärztliche Checkliste</h1>
      <p>Fall: {params.id}</p>
    </main>
  );
}
