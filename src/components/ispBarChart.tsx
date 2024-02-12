import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ChartData } from "@/app/types";

interface ISPBarChartProps {
  data: ChartData[];
}

const ISPBarChart: React.FC<ISPBarChartProps> = ({ data }) => {
  return (
    <BarChart width={600} height={300} data={data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="totalIPs" fill="#8884d8" />
    </BarChart>
  );
};

export default ISPBarChart;
