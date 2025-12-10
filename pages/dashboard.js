// pages/dashboard.js
import DashboardCalendar from "../components/DashboardCalendar";

const demoAppointments = [
  {
    id: 1,
    date: "2025-12-10",
    startTime: "08:30",
    endTime: "09:00",
    patientName: "John Smith",
    practitionerName: "Dr Naidoo",
    status: "confirmed",
  },
  {
    id: 2,
    date: "2025-12-10",
    startTime: "10:00",
    endTime: "10:30",
    patientName: "Sarah Williams",
    practitionerName: "Dr Smith",
    status: "confirmed",
  },
  {
    id: 3,
    date: "2025-12-11",
    startTime: "09:15",
    endTime: "09:45",
    patientName: "Michael Brown",
    practitionerName: "Dr Patel",
    status: "pending",
  },
  {
    id: 4,
    date: "2025-12-12",
    startTime: "14:00",
    endTime: "14:30",
    patientName: "Emily Johnson",
    practitionerName: "Dr Naidoo",
    status: "confirmed",
  },
  {
    id: 5,
    date: "2025-12-13",
    startTime: "11:00",
    endTime: "11:30",
    patientName: "David Green",
    practitionerName: "Dr Smith",
    status: "cancelled",
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      <DashboardCalendar appointments={demoAppointments} />
    </main>
  );
}
