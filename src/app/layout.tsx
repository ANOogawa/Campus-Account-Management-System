import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google"; // Using a nice font // Note: create-next-app uses Geist mostly now, but user asked for simple
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser, verifyIapToken } from "@/lib/auth";
import { hasApprovals } from "@/lib/db_utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "学内アカウント管理システム",
  description: "Guest Account Management System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 1. Get headers to extract IAP token
  const headersList = await headers();
  const iapJwt = headersList.get("x-goog-iap-jwt-assertion") || "";

  // 2. Verify Token -> Get Email
  const email = await verifyIapToken(iapJwt);

  // 3. Get User Profile
  // IF email is null, user is not authenticated via IAP (or dev mock failed)
  const user = email ? await getCurrentUser(email) : null;

  // 4. Check for approvals if user is staff
  const userHasApprovals = (user && user.employment_status === '正職員' && email)
    ? await hasApprovals(email)
    : false;

  return (
    <html lang="ja">
      <body className={`${inter.className} bg-gray-50 min-h-screen flex text-gray-900`}>
        {/* Sidebar */}
        <Sidebar user={user} hasApprovals={userHasApprovals} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
