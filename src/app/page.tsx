"use client";
import React, { useEffect, useState } from "react";
import { Tooltip } from "react-leaflet";
import { ResponsiveContainer, PieChart, Pie } from "recharts";

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
  const [groupedPeers, setGroupedPeers] = useState<IGroupedPeers>({});
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [pieData, setPieData] = useState<any[]>([]);

  const fetchPeers = async () => {
    const response = await fetch(`/api/queryNode?`);
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

  useEffect(() => {
    // Flatten the data to include ISPs as separate entries while keeping track of their countries
    const newData: React.SetStateAction<any[]> = [];
    Object.entries(groupedPeers).forEach(([country, { isps }]) => {
      Object.entries(isps).forEach(([isp, ips]) => {
        newData.push({
          name: `${isp} (${country})`,
          value: ips.length,
          country: country, // Keep track of the country for each ISP
          isp: isp,
          ips: ips, // Optional: Include the IPs if needed for tooltip or further details
        });
      });
    });
    setPieData(newData);
  }, [groupedPeers]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active: boolean;
    payload: any[];
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // Get the data for the active segment
      return (
        <div className="custom-tooltip bg-white shadow-lg p-3">
          <p className="label">{`${data.isp} in ${data.country}`}</p>
          <p className="intro">{`Total IPs: ${data.value}`}</p>
          {/* Optionally list IPs */}
          {/* <ul>{data.ips.map(ip => <li key={ip}>{ip}</li>)}</ul> */}
        </div>
      );
    }

    return null;
  };

  // Example of selecting a country, could be set from a dropdown or another UI element
  useEffect(() => {
    const firstCountry = Object.keys(groupedPeers)[0];
    setSelectedCountry(firstCountry);
  }, [groupedPeers]);

  return (
    <main className="flex min-h-screen flex-col overflow-clip mx-auto items-center justify-center p-4">
      <div className="mt-8 w-full max-w-4xl ">
        <ResponsiveContainer width="100%" height={500}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={200}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name }) => name.split(" ")[0]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-8 w-full max-w-4xl ">
        <h1 className="text-2xl font-bold mb-4">
          Peers Grouped by Country and ISP
        </h1>
        <div className="items-center max-h-screen overflow-y-auto justify-between">
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
      </div>
    </main>
  );
}
