"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import NotificationBell from "@/components/NotificationBell";

export default function RoomActions({ roomId, roomCode, isOwner }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

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
      setIsDropdownOpen(false);
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
      setIsDropdownOpen(false);
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

  const goToDashboard = () => {
    setIsDropdownOpen(false);
    router.push("/dashboard");
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="flex items-center gap-2">
      <NotificationBell />

      {/* Invite Button */}
      <button
        type="button"
        onClick={copyInviteLink}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        {copiedInvite ? "✓ Invite Copied" : "Invite"}
      </button>

      {/* Dropdown Menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="More options"
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10.5 1.5H9.5V3.5H10.5V1.5ZM10.5 8.5H9.5V10.5H10.5V8.5ZM10.5 15.5H9.5V17.5H10.5V15.5Z" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
            <div className="py-1">
              <button
                type="button"
                onClick={copyRoomCode}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {copiedCode ? "✓ Room Code Copied" : "Copy Room Code"}
              </button>

              <div className="border-t border-slate-100 my-1" />

              <button
                type="button"
                onClick={goToDashboard}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Go to Dashboard
              </button>

              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/chat/${roomId}/members`);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Manage Room
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Delete Room"}
                  </button>
                </>
              )}

              <div className="border-t border-slate-100 my-1" />

              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold animate-pulse z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
