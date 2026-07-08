import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Myotally",
  description: "Build training sessions from Notion and see weekly muscle frequency.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
