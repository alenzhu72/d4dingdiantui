import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "D4秘典｜暗黑破坏神 IV Build 攻略库",
  description: "发现、规划并分享 Diablo IV Build，包含技能树、巅峰盘、雕文、符印和装备词缀。",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
