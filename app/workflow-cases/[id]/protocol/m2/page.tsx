import { redirect } from "next/navigation";

export default async function InternalProtocolM2IndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/workflow-cases/${id}/protocol/m2/1`);
}
