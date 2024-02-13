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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`${inter.style}`}</style>
      </head>
      <body className="h-full sm:h-screen flex flex-col justify-center sm:block">
        <div className="block sm:hidden text-center">
          <div className="mx-auto font-bold text-white">
            Mobile is currently not supported. Please use a desktop browser.
          </div>
        </div>

        <div
          className={`${inter.className} hidden md:block ml-72 mx-auto my-auto`}
        >
          <SideNav />
          {children}
        </div>
      </body>
    </html>
  );
}
