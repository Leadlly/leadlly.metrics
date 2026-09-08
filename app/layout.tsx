import type { Metadata, Viewport } from "next";
import { Montserrat, MuseoModerno } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
});

const museoModerno = MuseoModerno({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Leadlly Metrics",
  description: "Read-only metrics for students, teachers, mentors, and institutes.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${museoModerno.variable} h-full overflow-x-clip antialiased`}
    >
      <body className="min-h-full overflow-x-clip font-sans">{children}</body>
    </html>
  );
}
