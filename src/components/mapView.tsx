import React, { useMemo, useState, useCallback } from "react";
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

const countries = "/countries.geojson";
const states = "/states.geojson";

const zoomLevels = [1, 2, 4];

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

  const colorScale = useMemo(
    () =>
      scaleLinear<string>()
        .domain([0, Object.keys(groupedPeers).length])
        .range(["#FFB3BA", "#FF6B6B"]),
    [groupedPeers]
  );

  const markerSizes = useMemo(() => {
    return zoomLevels.reduce((acc, zoom) => {
      acc[zoom] = 3 / zoom;
      return acc;
    }, {} as Record<number, number>);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (position.zoom >= 4) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom * 2 }));
  }, [position.zoom]);

  const handleZoomOut = useCallback(() => {
    if (position.zoom <= 1) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom / 2 }));
  }, [position.zoom]);

  const handleMoveEnd = useCallback((position: any) => {
    setPosition(position);
  }, []);

  const scaledMarkers = useMemo(() => {
    return markers.map((marker, index) => (
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
          r={markerSizes[position.zoom] || 3 / position.zoom}
          fill={colorScale(index)}
          stroke="#FFF"
          strokeWidth={0.5 / position.zoom}
          style={{
            cursor: "pointer",
            transition: "all 0.3s ease-in-out",
          }}
          data-tooltip-id="marker-tooltip"
        />
      </Marker>
    ));
  }, [markers, position.zoom, colorScale, markerSizes]);

  return (
    <div
      className="border border-l-white border-r-white border-t-white border-b-transparent "
      style={{
        width: "98%",
        height: "92vh",
        background: "#111827",
        position: "relative",
      }}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 130,
          center: [0, 20],
        }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={handleMoveEnd}
        >
          <Geographies geography={countries}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1F2937"
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#2C3E50" },
                    pressed: { outline: "none" },
                  }}
                  stroke="#EAEAEC"
                  strokeWidth={0.5}
                />
              ))
            }
          </Geographies>
          <Geographies geography={states}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1F2937"
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#2C3E50" },
                    pressed: { outline: "none" },
                  }}
                  stroke="#EAEAEC"
                  strokeWidth={0.5}
                />
              ))
            }
          </Geographies>
          {scaledMarkers}
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
