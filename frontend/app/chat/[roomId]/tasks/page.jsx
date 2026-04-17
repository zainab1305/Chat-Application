import TasksClient from "../TasksClient";

export default async function RoomTasksPage({ params }) {
  const { roomId } = await params;

  return <TasksClient roomId={roomId} />;
}