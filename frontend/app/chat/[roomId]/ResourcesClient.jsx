"use client";

import { useEffect, useState } from "react";

export default function ResourcesClient({ roomId }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ type: "link", url: "", name: "" });
  const [selectedFile, setSelectedFile] = useState(null);

  const loadResources = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/rooms/${roomId}/resources`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to load resources");

      setResources(data.resources || []);
    } catch (err) {
      setError(err.message || "Unable to load resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, [roomId]);

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError("");

    try {
      let payload = { type: form.type, url: form.url, name: form.name };

      if (form.type === "file") {
        if (!selectedFile) throw new Error("Please choose a file");
        const dataUrl = await readFileAsDataUrl(selectedFile);
        payload = {
          type: "file",
          url: String(dataUrl),
          name: form.name || selectedFile.name,
        };
      }

      const response = await fetch(`/api/rooms/${roomId}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save resource");

      setResources((prev) => [data.resource, ...prev]);
      setForm({ type: "link", url: "", name: "" });
      setSelectedFile(null);
    } catch (err) {
      setError(err.message || "Failed to save resource");
    } finally {
      setCreating(false);
    }
  };

  const openResource = async (resource) => {
    try {
      if (resource.type === "link") {
        window.open(resource.url, "_blank", "noopener,noreferrer");
        return;
      }

      const response = await fetch(resource.url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = resource.name || "resource-file";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err.message || "Unable to open resource");
    }
  };

  if (loading) {
    return (
      <div className="workspace-section workspace-loading" aria-label="Loading resources">
        <div className="workspace-loading-header">
          <div className="workspace-loading-line medium" />
          <div className="workspace-loading-line short" />
        </div>

        <div className="workspace-loading-card workspace-loading-header">
          <div className="workspace-loading-line medium" />
          <div className="workspace-loading-line" />
          <div className="workspace-loading-row">
            <div className="workspace-loading-chip" />
            <div className="workspace-loading-line medium" />
            <div className="workspace-loading-action" />
          </div>
        </div>

        <div className="workspace-loading-grid">
          <div className="workspace-loading-card workspace-loading-header">
            <div className="workspace-loading-line medium" />
            <div className="workspace-loading-line short" />
            <div className="workspace-loading-action" />
          </div>
          <div className="workspace-loading-card workspace-loading-header">
            <div className="workspace-loading-line medium" />
            <div className="workspace-loading-line short" />
            <div className="workspace-loading-action" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-section">
      {error && <p className="error-banner">{error}</p>}

      <form className="workspace-form" onSubmit={handleSubmit}>
        <select
          value={form.type}
          onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
        >
          <option value="link">Link</option>
          <option value="file">File</option>
        </select>

        {form.type === "link" ? (
          <input
            value={form.url}
            onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
            placeholder="Paste a link"
            required
          />
        ) : (
          <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
        )}

        <input
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Optional name"
        />

        <button className="primary-btn" type="submit" disabled={creating}>
          {creating ? "Saving..." : "Add Resource"}
        </button>
      </form>

      <div className="workspace-list">
        {resources.length === 0 ? (
          <p className="message-empty">No resources yet.</p>
        ) : (
          resources.map((resource) => (
            <article key={resource._id} className="workspace-card">
              <h3>{resource.name || resource.url}</h3>
              <p className="workspace-meta">
                {resource.type === "file" ? "File" : "Link"} • {resource.uploadedBy?.name || resource.uploadedBy?.email || "Member"}
              </p>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => openResource(resource)}
              >
                {resource.type === "file" ? "Download file" : "Open link"}
              </button>
            </article>
          ))
        )}
      </div>
    </div>
  );
}