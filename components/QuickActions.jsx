// components/QuickActions.jsx
"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import NewAppointmentModal from "@/components/NewAppointmentModal";

export default function QuickActions() {
  function refresh() {
    window.dispatchEvent(new CustomEvent("refresh-day-appts"));
  }
  function goToday() {
    window.dispatchEvent(new CustomEvent("go-today"));
  }

  return (
    <Card className="p-4 flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-semibold">Quick Actions</div>
        <div className="text-xs text-slate-600">Create, refresh, or jump to today</div>
      </div>
      <div className="flex items-center gap-2">
        <NewAppointmentModal onCreated={refresh} />
        <Button variant="outline" onClick={refresh}>Refresh</Button>
        <Button onClick={goToday}>Today</Button>
      </div>
    </Card>
  );
}
