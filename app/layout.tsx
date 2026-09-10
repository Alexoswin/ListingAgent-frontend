import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Circle | Better things, already loved",
  description: "Thoughtfully checked pre-owned goods for a second life.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
