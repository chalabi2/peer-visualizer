"use client";
import dynamic from "next/dynamic";
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
  const [inputIp, setInputIp] = useState("");
  const [groupedPeers, setGroupedPeers] = useState<IGroupedPeers>({});
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [pieData, setPieData] = useState<any[]>([]);

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
    if (typeof window !== "undefined") {
      fetchPeers();
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (selectedCountry && groupedPeers[selectedCountry]) {
        const isps = groupedPeers[selectedCountry].isps;
        const newData = Object.entries(isps).map(([isp, ips]) => ({
          name: isp,
          value: ips.length,
        }));
        setPieData(newData);
      }
    }
  }, [selectedCountry, groupedPeers]);

  // Example of selecting a country, could be set from a dropdown or another UI element
  useEffect(() => {
    if (typeof window !== "undefined") {
      const firstCountry = Object.keys(groupedPeers)[0];
      setSelectedCountry(firstCountry);
    }
  }, [groupedPeers]);

  return (
    <main className="flex min-h-screen flex-col mx-auto items-center justify-center p-4">
      <div className="mt-8 w-full max-w-4xl ">
        <h1 className="text-2xl font-bold mb-4">
          Peers Grouped by Country and ISP
        </h1>
        <select
          onChange={(e) => setSelectedCountry(e.target.value)}
          value={selectedCountry || ""}
        >
          {Object.keys(groupedPeers).map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={150}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
            ></Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </main>
  );
}
