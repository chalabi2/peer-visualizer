"use client";
import React, { useEffect, useState } from "react";

export default function Home() {
  const [inputIp, setInputIp] = useState("");
  const [groupedPeers, setGroupedPeers] = useState({});

  const fetchPeers = async () => {
    const response = await fetch(`/api/queryNode?nodeIP=${inputIp}`);
    const data = await response.json();
    if (Array.isArray(data)) {
      // Group the data by country and ISP
      const grouped = data.reduce(
        (acc, { ip, country = "Unknown", isp = "Unknown ISP" }) => {
          if (!acc[country]) acc[country] = {};
          if (!acc[country][isp]) acc[country][isp] = [];
          acc[country][isp].push(ip);
          return acc;
        },
        {}
      );
      setGroupedPeers(grouped);
    } else {
      console.error("Received data is not an array", data);
      setGroupedPeers({});
    }
  };

  useEffect(() => {
    fetchPeers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mt-8 w-full max-w-4xl ">
        <h1 className="text-2xl font-bold mb-4">
          Peers Grouped by Country and ISP
        </h1>
        {Object.entries(groupedPeers).map(([country, isps], countryIndex) => (
          <React.Fragment key={countryIndex}>
            <h2 className="text-xl font-semibold mt-6 mb-2">{country}</h2>
            <table className=" text-black table-auto w-full  ">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-4 py-2">ISP</th>
                  <th className="px-4 py-2">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries<{ [key: string]: string[] }>(
                  isps as { [s: string]: { [key: string]: string[] } }
                ).flatMap(([isp, ips], ispIndex) => [
                  ...(Array.isArray(ips)
                    ? ips.map((ip: string, ipIndex: number) => (
                        <tr
                          key={`${ispIndex}-${ipIndex}`}
                          className={`${
                            ipIndex % 2 === 0 ? "bg-gray-100" : "bg-white"
                          }`}
                        >
                          <td className="border px-4 py-2">
                            {ipIndex === 0 ? isp : ""}
                          </td>
                          <td className="border px-4 py-2">{ip}</td>
                        </tr>
                      ))
                    : []),
                ])}
              </tbody>
            </table>
          </React.Fragment>
        ))}
      </div>
    </main>
  );
}
