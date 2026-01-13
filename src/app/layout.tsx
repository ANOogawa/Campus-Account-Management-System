import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import "./globals.css";
import MobileLayout from "@/components/MobileLayout";
import { getCurrentUser, getSessionEmail, UserProfileSerializable } from "@/lib/auth";
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
  // セッションからメールアドレスを取得
  const email = await getSessionEmail();

  // ユーザー情報を取得
  const user = email ? await getCurrentUser(email) : null;

  // 認証済みだがuser_masterに存在しない場合
  const isAuthenticatedButNotInMaster = email !== null && user === null;

  // 承認権限チェック
  const userHasApprovals = (user && user.employment_status === '正職員' && email)
    ? await hasApprovals(email)
    : false;

  // userオブジェクトからFirestore Timestamp（updated_at）とpassword_hashを除外してシリアライズ可能にする
  // Sidebarコンポーネントで使用されるフィールドのみを抽出
  const serializedUser: UserProfileSerializable | null = user ? {
    id: user.id,
    last_name: user.last_name,
    first_name: user.first_name,
    department: user.department,
    employment_status: user.employment_status,
    is_admin: user.is_admin
  } : null;

  return (
    <html lang="ja">
      <body className={`${inter.className} bg-gray-900 min-h-screen flex text-gray-100`}>
        <MobileLayout
          user={serializedUser}
          hasApprovals={userHasApprovals}
          isAuthenticatedButNotInMaster={isAuthenticatedButNotInMaster}
          authenticatedEmail={email || undefined}
        >
          {children}
        </MobileLayout>
      </body>
    </html>
  );
}
