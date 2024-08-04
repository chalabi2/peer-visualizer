import React, { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { Tooltip } from "react-tooltip";
import { IGroupedPeers } from "@/app/page";

const geoUrl = "/countries.geojson";

const MapView = ({ groupedPeers }: { groupedPeers: IGroupedPeers }) => {
  const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 } as {
    coordinates: [number, number];
    zoom: number;
  });
  const [tooltipContent, setTooltipContent] = useState("");

  const markers = useMemo(() => {
    if (!groupedPeers) return [];
    return Object.entries(groupedPeers).flatMap(([country, countryData]) =>
      Object.entries(countryData.isps).flatMap(([isp, ips]) =>
        ips.map(({ ip, lat, lon }) => ({
          ip,
          country,
          isp,
          coordinates: [parseFloat(lon), parseFloat(lat)],
        }))
      )
    );
  }, [groupedPeers]);

  const colorScale = scaleLinear<string>()
    .domain([0, Object.keys(groupedPeers).length])
    .range(["#FFB3BA", "#FF6B6B"]);

  const handleZoomIn = () => {
    if (position.zoom >= 4) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom * 2 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom / 2 }));
  };

  const handleMoveEnd = (position: any) => {
    setPosition(position);
  };

  return (
    <div
      className="border border-white max-h-[90vh] overflow-y-auto"
      style={{
        width: "98%",
        height: "90vh",
        background: "#111827",
        position: "relative",
      }}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 130,
        }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={handleMoveEnd}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#2C3E50"
                  stroke="#EAEAEC"
                  strokeWidth={0.5}
                />
              ))
            }
          </Geographies>
          {markers.map((marker, index) => (
            <Marker
              key={index}
              coordinates={marker.coordinates as [number, number]}
              onMouseEnter={() => {
                setTooltipContent(
                  `IP: ${marker.ip}<br/>Country: ${marker.country}<br/>ISP: ${marker.isp}`
                );
              }}
              onMouseLeave={() => {
                setTooltipContent("");
              }}
            >
              <circle
                r={3 / position.zoom}
                fill={colorScale(index)}
                stroke="#FFF"
                strokeWidth={0.5 / position.zoom}
                style={{ cursor: "pointer" }}
                data-tooltip-id="marker-tooltip"
              />
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>
      <div style={{ position: "absolute", right: "1rem", top: "1rem" }}>
        <button onClick={handleZoomIn} className="p-2 bg-white text-black m-1">
          +
        </button>
        <button onClick={handleZoomOut} className="p-2 bg-white text-black m-1">
          -
        </button>
      </div>
      <Tooltip id="marker-tooltip" html={tooltipContent} />
    </div>
  );
};

export default MapView;
