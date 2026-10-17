"use client";

export default function ClientHydrationGuard({ children }: { children: React.ReactNode }) {
  return (
    <div suppressHydrationWarning style={{ display: "contents" }}>
      {children}
    </div>
  );
}
