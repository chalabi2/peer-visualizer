"use client";
import React, { useEffect, useState } from "react";

interface IPeer {
  ip: string;
  country: string;
  isp: string;
}

interface IISPInfo {
  [isp: string]: string[]; // ISP name as key and array of IPs as value
}

interface ICountryInfo {
  totalIPs: number;
  isps: IISPInfo;
}

interface IGroupedPeers {
  [country: string]: ICountryInfo; // Country name as key and country info as value
}

export default function Home() {
  const [inputIp, setInputIp] = useState("");
  const [groupedPeers, setGroupedPeers] = useState<IGroupedPeers>({});

  const fetchPeers = async () => {
    const response = await fetch(`/api/queryNode?nodeIP=${inputIp}`);
    const data: IPeer[] = await response.json();
    if (Array.isArray(data)) {
      const grouped = data.reduce<IGroupedPeers>(
        (acc, { ip, country, isp }) => {
          if (!acc[country]) acc[country] = { totalIPs: 0, isps: {} };
          if (!acc[country].isps[isp]) acc[country].isps[isp] = [];
          acc[country].isps[isp].push(ip);
          acc[country].totalIPs += 1;
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
  }, []);

  return (
    <main className="flex min-h-screen flex-col mx-auto items-center justify-center p-4">
      <div className="mt-8 w-full max-w-4xl ">
        <h1 className="text-2xl font-bold mb-4">
          Peers Grouped by Country and ISP
        </h1>
        {Object.entries(groupedPeers).map(
          ([country, { totalIPs, isps }], countryIndex) => (
            <React.Fragment key={countryIndex}>
              <h2 className="text-xl font-semibold mt-6 mb-2">{`${country} (${totalIPs})`}</h2>
              <table className="text-black table-auto w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-4 py-2">ISP</th>
                    <th className="px-4 py-2">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(isps).flatMap(([isp, ips], ispIndex) => [
                    ...ips.map((ip, ipIndex) => (
                      <tr
                        key={`${ispIndex}-${ipIndex}`}
                        className={`${
                          ipIndex % 2 === 0 ? "bg-gray-100" : "bg-white"
                        }`}
                      >
                        <td className="border px-4 py-2">
                          {ipIndex === 0 && ips.length > 1
                            ? `${isp} (${ips.length})`
                            : ipIndex === 0
                            ? isp
                            : ""}
                        </td>
                        <td className="border px-4 py-2">{ip}</td>
                      </tr>
                    )),
                  ])}
                </tbody>
              </table>
            </React.Fragment>
          )
        )}
      </div>
    </main>
  );
}
