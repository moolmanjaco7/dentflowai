// app/layout.tsx

import React from "react";

export const metadata = {
  title: "DentFlowAI",
  description: "Smart online bookings and scheduling for South African clinics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-50">
        {children}
      </body>
    </html>
  );
}
