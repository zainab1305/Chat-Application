import ResourcesClient from "../ResourcesClient";

export default async function RoomResourcesPage({ params }) {
  const { roomId } = await params;

  return <ResourcesClient roomId={roomId} />;
}