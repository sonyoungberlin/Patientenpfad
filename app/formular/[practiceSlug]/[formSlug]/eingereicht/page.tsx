import SubmittedPage from "@/app/p/[slug]/eingereicht/page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PublicPracticeFormSubmittedPage() {
  return <SubmittedPage />;
}