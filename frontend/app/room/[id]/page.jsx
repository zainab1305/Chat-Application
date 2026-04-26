import { redirect } from "next/navigation";

export default async function RoomAliasPage({ params }) {
  const { id } = await params;

  redirect(`/chat/${id}/chat`);
}
