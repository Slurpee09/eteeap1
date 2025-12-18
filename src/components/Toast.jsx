import React from "react";

export default function Toast({ message, type = "success", onClose }) {
  if (!message) return null;
  const base = "fixed right-4 bottom-6 z-50 max-w-sm w-full shadow-lg rounded px-4 py-3 text-sm flex items-start gap-3";
  const bg = type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white";

  return (
    <div className={`${base} ${bg}`} role="status">
      <div className="flex-1">{message}</div>
      <button onClick={onClose} className="font-bold">✕</button>
    </div>
  );
}
