import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { DialogProvider } from "@/components/DialogProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Jin Engine - Packaging Solutions System",
  description: "Jin Engine - Enterprise Packaging & Corrugation Plant Management System",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jin Engine",
  },
  icons: {
    icon: "/jin-engine-logo.svg",
    apple: "/jin-engine-icon-512.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          storageKey="jin-engine-theme"
          disableTransitionOnChange
        >
          <AuthProvider>
            <DialogProvider>
              <ClientLayout>{children}</ClientLayout>
            </DialogProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
