"use client";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const SideNav = () => {
  const router = useRouter();

  const handleNetworkSelect = (networkName: string) => {
    const currentView = searchParams?.get("view") || "chart";
    router.push(`/?network=${networkName}&view=${currentView}`, undefined);
  };

  const searchParams = useSearchParams();

  const networks = [
    { name: "Akash", url: "#Akash" },
    { name: "Berachain", url: "#Berachain" },
    { name: "Canto", url: "#Canto" },
    { name: "Celestia", url: "#Celestia" },
    { name: "Dymension", url: "#Dymension" },
    { name: "Evmos", url: "#Evmos" },
    { name: "Gravity", url: "#Gravity" },
    { name: "Injective", url: "#Injective" },
    { name: "Osmosis", url: "#Osmosis" },
  ];

  const handleTableView = () => {
    const currentNetwork = searchParams?.get("network") || "Akash";
    router.push(`/?network=${currentNetwork}&view=table`, undefined);
  };

  const handleChartView = () => {
    const currentNetwork = searchParams?.get("network") || "Akash";
    router.push(`/?network=${currentNetwork}&view=chart`, undefined);
  };

  const isActiveNetwork = (networkName: string) => {
    return searchParams?.get("network") === networkName;
  };

  const isActiveView = (viewName: string) => {
    return searchParams?.get("view") === viewName;
  };

  return (
    <>
      <button
        data-drawer-target="default-sidebar"
        data-drawer-toggle="default-sidebar"
        aria-controls="default-sidebar"
        type="button"
        className="inline-flex items-center p-2 mt-2 ml-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
      >
        <span className="sr-only">Open sidebar</span>
        <svg
          className="w-6 h-6"
          aria-hidden="true"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            clip-rule="evenodd"
            fill-rule="evenodd"
            d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
          ></path>
        </svg>
      </button>

      <aside
        id="default-sidebar"
        className="fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full sm:translate-x-0"
        aria-label="Sidenav"
      >
        <div className="overflow-y-auto py-5 px-3 h-full bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <ul className="space-y-2">
            <li>
              <a
                href="#"
                className={`flex items-center p-2 text-base font-normal rounded-lg transition duration-75 group ${
                  isActiveView("chart")
                    ? "bg-blue-500 text-white"
                    : "text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                }`}
                onClick={handleChartView}
              >
                <svg
                  aria-hidden="true"
                  className={`w-6 h-6 transition duration-75 ${
                    isActiveView("chart")
                      ? "text-white"
                      : "text-gray-400 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path>
                  <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"></path>
                </svg>
                <span className="ml-3">Chart</span>
              </a>
            </li>
            <li>
              <a
                href="#"
                className={`flex items-center p-2 text-base font-normal rounded-lg transition duration-75 group ${
                  isActiveView("table")
                    ? "bg-blue-500 text-white"
                    : "text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                }`}
                onClick={handleTableView}
              >
                <svg
                  aria-hidden="true"
                  className={`w-6 h-6 transition duration-75 ${
                    isActiveView("table")
                      ? "text-white"
                      : "text-gray-400 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
                <span className="ml-3">Table</span>
              </a>
            </li>
          </ul>
          <ul className="pt-5 mt-5 space-y-2 border-t border-gray-200 dark:border-gray-700">
            {networks.map((network, index) => (
              <li key={index}>
                <a
                  href={network.url}
                  onClick={() => handleNetworkSelect(network.name)}
                  className={`flex items-center p-2 text-base font-normal rounded-lg transition duration-75 group ${
                    isActiveNetwork(network.name)
                      ? "bg-blue-500 text-white"
                      : "text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                  }`}
                >
                  <svg
                    aria-hidden="true"
                    className="flex-shrink-0 w-6 h-6 text-gray-400 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  ></svg>
                  <span className="ml-3">{network.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
};

export default function SideNavWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SideNav />
    </Suspense>
  );
}
