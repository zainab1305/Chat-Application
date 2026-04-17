"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RoomActions({ roomId, isOwner }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;

    const confirmed = window.confirm("Delete this room permanently?");
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete room");
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      window.alert(error.message || "Failed to delete room");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="chat-header-actions room-header-actions">
      <button className="ghost-btn" onClick={() => router.push("/dashboard")}>Dashboard</button>
      {isOwner && (
        <button className="danger-btn" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Delete Room"}
        </button>
      )}
      <button className="ghost-btn" onClick={() => signOut({ callbackUrl: "/login" })}>
        Logout
      </button>
    </div>
  );
}