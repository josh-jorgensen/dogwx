import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dogwalk Index",
  description:
    "Compare dog walking conditions over the next hour using hyper-local weather data."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
