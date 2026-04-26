"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import NotificationBell from "@/components/NotificationBell";

export default function RoomActions({ roomId, roomCode, isOwner }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(null), 2200);
  }

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode || "");
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1400);
      showToast("Room code copied");
    } catch {
      window.alert("Unable to copy room code");
    }
  };

  const copyInviteLink = async () => {
    try {
      const invite = `${window.location.origin}/room/${roomId}`;
      await navigator.clipboard.writeText(invite);
      setCopiedInvite(true);
      window.setTimeout(() => setCopiedInvite(false), 1400);
      showToast("Invite link copied");
    } catch {
      window.alert("Unable to copy invite link");
    }
  };

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
      <NotificationBell />
      <button type="button" className="ghost-btn room-icon-btn" onClick={copyRoomCode}>
        {copiedCode ? "Copied" : "Copy Code"}
      </button>
      <button type="button" className="secondary-btn" onClick={copyInviteLink}>
        {copiedInvite ? "Invite Copied" : "Invite"}
      </button>
      {isOwner && (
        <button
          type="button"
          className="ghost-btn room-icon-btn"
          onClick={() => router.push(`/chat/${roomId}/members`)}
          aria-label="Room settings"
          title="Room settings"
        >
          Manage
        </button>
      )}
      <button className="ghost-btn" onClick={() => router.push("/dashboard")}>
        Dashboard
      </button>
      {isOwner && (
        <button className="danger-btn" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Delete Room"}
        </button>
      )}
      <button className="ghost-btn" onClick={() => signOut({ callbackUrl: "/login" })}>
        Logout
      </button>
      {toast ? (
        <div className="app-toast app-toast-success room-header-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
