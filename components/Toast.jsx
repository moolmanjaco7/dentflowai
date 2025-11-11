// components/Toast.jsx
"use client";
import * as React from "react";

/** Fire a toast anywhere:
 * window.dispatchEvent(new CustomEvent("toast", { detail: { title: "Saved", type: "success" }}))
 */
export function toast(detail) {
  window.dispatchEvent(new CustomEvent("toast", { detail }));
}

export default function Toasts() {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    function onToast(e) {
      const id = Math.random().toString(36).slice(2);
      const it = { id, ...(e.detail || {}), ts: Date.now() };
      setItems((prev) => [...prev, it]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, 3500);
    }
    window.addEventListener("toast", onToast);
    return () => window.removeEventListener("toast", onToast);
  }, []);
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={[
            "min-w-[220px] max-w-[340px] rounded-lg border p-3 shadow bg-white",
            t.type === "error" ? "border-red-300" :
            t.type === "success" ? "border-emerald-300" : "border-slate-200"
          ].join(" ")}
        >
          <div className="text-sm font-medium">
            {t.title || "Notice"}
          </div>
          {t.desc && <div className="text-xs text-slate-600 mt-1">{t.desc}</div>}
        </div>
      ))}
    </div>
  );
}
