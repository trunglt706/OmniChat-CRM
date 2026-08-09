import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { HtmlLangSync } from "@/components/i18n/html-lang";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";

const getSeoSettings = unstable_cache(
  async () => {
    const settings = await db.systemSetting.findMany({
      where: {
        key: { in: ['seo_title', 'seo_description', 'seo_keywords', 'seo_logo'] }
      }
    })

    const config: Record<string, string> = {}
    settings.forEach(s => { config[s.key] = s.value })
    return config
  },
  ['seo-settings-cache'],
  { tags: ['seo-settings'] }
)

export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await getSeoSettings();

    return {
      title: config.seo_title || "OmniChat CRM - Multi Channel Chat System",
      description: config.seo_description || "Multi-channel customer support CRM system | Hệ thống quản lý hội thoại đa kênh",
      keywords: config.seo_keywords || "crm, chat, omnichannel",
      icons: {
        icon: config.seo_logo || "",
      },
    }
  } catch (error) {
    return {
      title: "OmniChat CRM",
      description: "Hệ thống quản lý hội thoại đa kênh",
    }
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <HtmlLangSync />
          {children}
          <Toaster />
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}