import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SideNav from "@/components/sideNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cosmos Peer Visualizer",
  description: "A visualization of Cosmos peers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="h-full bg-gray-900" lang="en">
      <SideNav />
      <body className={`${inter.className} h-full ml-72 mx-auto my-auto`}>
        {children}
      </body>
    </html>
  );
}
