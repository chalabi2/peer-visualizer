"use client";
import { useSearchParams } from "next/navigation";

import React, { useEffect, useState, Suspense } from "react";

import { ResponsiveContainer, PieChart, Pie, Tooltip, Cell } from "recharts";

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

function Home() {
  const searchParams = useSearchParams();
  const initialNetwork = searchParams?.has("network")
    ? searchParams.get("network")
    : "Akash";

  const view = searchParams?.get("view") || "chart";
  const [selectedNetwork, setSelectedNetwork] = useState(initialNetwork);

  // Your existing state and function declarations...

  // Fetch peers whenever selectedNetwork changes
  useEffect(() => {
    fetchPeers(selectedNetwork ?? "Akash");
  }, [selectedNetwork]);

  // UseEffect to sync selectedNetwork with URL 'network' query parameter
  useEffect(() => {
    const networkParam = searchParams?.has("network")
      ? searchParams.get("network")
      : "Akash";
    setSelectedNetwork(networkParam);
  }, [searchParams]);

  const [groupedPeers, setGroupedPeers] = useState<IGroupedPeers>({});

  const [pieData, setPieData] = useState<any[]>([]);
  const [countryPieData, setCountryPieData] = useState<any[]>([]);
  const [totalFoundNodes, setTotalFoundNodes] = useState(0);
  const [countryWithMostNodes, setCountryWithMostNodes] = useState({
    name: "",
    count: 0,
  });
  const [mostUsedISP, setMostUsedISP] = useState({ name: "", count: 0 });

  useEffect(() => {
    let ispCounts = new Map<string, number>();

    Object.values(groupedPeers).forEach(({ isps }) => {
      Object.entries(isps).forEach(([isp, ips]) => {
        ispCounts.set(isp, (ispCounts.get(isp) || 0) + ips.length);
      });
    });

    let mostUsedISPName = "";
    let maxCount = 0;

    ispCounts.forEach((count, isp) => {
      if (count > maxCount) {
        mostUsedISPName = isp;
        maxCount = count;
      }
    });

    setMostUsedISP({ name: mostUsedISPName, count: maxCount });
  }, [groupedPeers]);

  const fetchPeers = async (network: string) => {
    const response = await fetch(`/api/queryNode?network=${network}`);
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
    const ispTotals = new Map();

    // Aggregate ISPs across all countries
    Object.values(groupedPeers).forEach(({ isps }) => {
      Object.entries(isps).forEach(([isp, ips]) => {
        if (!ispTotals.has(isp)) {
          ispTotals.set(isp, 0);
        }
        ispTotals.set(isp, ispTotals.get(isp) + ips.length);
      });
    });

    // Create pie chart data from the aggregated ISP totals
    const newData = Array.from(ispTotals, ([isp, totalIPs]) => ({
      name: isp,
      value: totalIPs,
    }));

    setPieData(newData);
  }, [groupedPeers]);

  useEffect(() => {
    // Aggregate the total IPs per country
    const countryTotals = Object.entries(groupedPeers).map(
      ([country, info]) => ({
        name: country,
        value: info.totalIPs,
      })
    );

    // Assuming you want to keep the ISP data as well, you might need a separate state for the country pie data
    setCountryPieData(countryTotals);
  }, [groupedPeers]);

  useEffect(() => {
    let totalNodes = 0;
    let maxNodes = 0;
    let countryWithMaxNodes = { name: "", count: 0 };

    Object.entries(groupedPeers).forEach(([country, { totalIPs }]) => {
      totalNodes += totalIPs;
      if (totalIPs > maxNodes) {
        maxNodes = totalIPs;
        countryWithMaxNodes = { name: country, count: totalIPs };
      }
    });

    setTotalFoundNodes(totalNodes);
    setCountryWithMostNodes(countryWithMaxNodes);
  }, [groupedPeers]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active: boolean;
    payload: any[];
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      // Determine if the hovered item is a country or an ISP
      const isCountry = data.country ? false : true;

      return (
        <div className="custom-tooltip text-black bg-white shadow-lg p-3">
          <p className="label">{`${data.name}`}</p>
          {isCountry ? (
            <p className="intro">{`Total IPs: ${data.value}`}</p>
          ) : (
            <>
              <p className="intro">{`ISP: ${data.name}`}</p>
              <p className="intro">{`IPs: ${data.value}`}</p>
              <p className="intro">{`Country: ${data.country}`}</p>
            </>
          )}
        </div>
      );
    }

    return null;
  };

  useEffect(() => {
    let countryData: any[] = [];
    let ispData: any[] = [];

    Object.entries(groupedPeers).forEach(
      ([country, { totalIPs, isps }], countryIndex) => {
        // For the inner pie (countries)
        countryData.push({
          name: country,
          value: totalIPs,
          // Adding a custom field to help sort ISPs in the outer pie
          order: countryIndex,
        });

        // For the outer pie (ISPs), directly associating each ISP with its country's index order
        Object.entries(isps).forEach(([isp, ips]) => {
          ispData.push({
            name: isp,
            value: ips.length,
            countryOrder: countryIndex, // Link ISPs to their country's order
          });
        });
      }
    );

    // Sort ISPs by the order of their country to keep them logically grouped
    ispData.sort((a, b) => a.countryOrder - b.countryOrder);

    setCountryPieData(countryData);
    setPieData(ispData);
  }, [groupedPeers]);

  const renderCustomLabel = ({
    name,
    percent,
  }: {
    name: string;
    percent: number;
  }) => {
    // Only show label if percent is 10% or more
    if (percent >= 0.03) {
      return `${name}: ${(percent * 100).toFixed(0)}%`;
    }
    return null;
  };

  const renderCustomCountryLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
    name,
    value,
    payload,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
    index: number;
    name: string;
    value: number;
    payload: any;
  }) => {
    const RADIAN = Math.PI / 180;
    // Calculate the outer arc's centroid which will be used for placing the label
    const radius = (innerRadius + outerRadius) / 2; // Position the label in the middle of the pie slice
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Correct the angle when text is upside down
    let rotation = midAngle;
    if (rotation > 90 && rotation < 270) {
      rotation = rotation + 180;
    }

    return value >= 24 ? (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12} // Adjust the font size as needed
      >
        {name}
      </text>
    ) : null;
  };

  const renderView = () => {
    switch (view) {
      case "table":
        return (
          <div className="mt-8 w-full max-w-4xl ">
            <div className="mb-4">
              <span className="text-white font-extrabold text-4xl">
                {selectedNetwork}
              </span>
            </div>
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
                        {Object.entries(isps).flatMap(
                          ([isp, ips], ispIndex) => [
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
                          ]
                        )}
                      </tbody>
                    </table>
                  </React.Fragment>
                )
              )}
            </div>
          </div>
        );
      case "chart":
      default:
        return (
          <div className="mt-8 w-full flex flex-col max-w-8xl overflow-clip ">
            <div className="top-4 absolute">
              <span className="text-white  font-extrabold text-4xl">
                {selectedNetwork}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={700}>
              <PieChart>
                <Pie
                  data={countryPieData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={180}
                  fill="#00C49F"
                  nameKey="name"
                  label={renderCustomCountryLabel}
                  labelLine={false}
                >
                  {countryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#00C49F" />
                  ))}
                </Pie>

                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={190}
                  outerRadius={240}
                  fill="#0088FE"
                  label={renderCustomLabel}
                  labelLine={false}
                ></Pie>
                <Tooltip
                  content={<CustomTooltip active={false} payload={[]} />}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="bottom-4 absolute">
              <h3 className="text-xl font-semibold">Statistics</h3>
              <h4 className="text-md font-semibold">
                Total Nodes:{" "}
                <a className="text-md font-normal">{totalFoundNodes}</a>
              </h4>
              <h4 className="text-md font-semibold">
                Country With Most Nodes:{" "}
                <a className="text-md font-normal">
                  {countryWithMostNodes.name} ({countryWithMostNodes.count})
                </a>
              </h4>
              <h4 className="text-md font-semibold">
                Most Used ISP:{" "}
                <a className="text-md font-normal">
                  {mostUsedISP.name} ({mostUsedISP.count})
                </a>
              </h4>
            </div>
          </div>
        );
    }
  };

  return (
    <main className="flex min-h-screen max-w-screen flex-col overflow-clip mx-auto items-center justify-center">
      {renderView()}
    </main>
  );
}

export default function HomeWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Home />
    </Suspense>
  );
}
