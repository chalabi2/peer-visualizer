import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
  Annotation,
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { Tooltip } from "react-tooltip";
import { IGroupedPeers } from "@/app/page";
import { geoCentroid } from "d3-geo";
import { set } from "mongoose";

const countries = "/countries50.geojson";
const states = "/states.geojson";

const zoomLevels = [1, 2, 4, 8, 16];

interface IMarker {
  ip: string;
  country: string;
  isp: string;
  coordinates: [number, number];
}

const MapView = ({ groupedPeers }: { groupedPeers: IGroupedPeers }) => {
  const [position, setPosition] = useState({
    coordinates: [0, 0] as [number, number],
    zoom: 1,
  });

  const [tooltipContent, setTooltipContent] = useState("");
  const [selectedMarker, setSelectedMarker] = useState<IMarker | null>(null);
  const [focusedMarker, setFocusedMarker] = useState<IMarker | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [selectedGeo, setSelectedGeo] = useState<string | null>(null);

  const markers = useMemo(() => {
    if (!groupedPeers) return [];
    return Object.entries(groupedPeers).flatMap(([country, countryData]) =>
      Object.entries(countryData.isps).flatMap(([isp, ips]) =>
        ips.map(({ ip, lat, lon }) => ({
          ip,
          country,
          isp,
          coordinates: [parseFloat(lon), parseFloat(lat)] as [number, number],
        }))
      )
    );
  }, [groupedPeers]);

  const colorScale = useMemo(
    () =>
      scaleLinear<string>()
        .domain([0, Object.keys(groupedPeers).length])
        .range(["#d4b3ffbb", "#001affbb"]),
    [groupedPeers]
  );

  const markerSizes = useMemo(() => {
    return zoomLevels.reduce((acc, zoom) => {
      acc[zoom] = Math.max(0.5, 3 / Math.sqrt(zoom));
      return acc;
    }, {} as Record<number, number>);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (position.zoom >= zoomLevels[zoomLevels.length - 1]) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom * 2 }));
  }, [position.zoom]);

  const handleZoomOut = useCallback(() => {
    if (position.zoom <= zoomLevels[0]) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom / 2 }));
  }, [position.zoom]);

  const handleMoveEnd = useCallback(
    (pos: { coordinates: [number, number]; zoom: number }) => {
      setPosition(pos);
    },
    []
  );

  const handleMarkerClick = useCallback((marker: IMarker) => {
    setSelectedGeo(null);
    setFocusedMarker(marker);
    setSelectedMarker(marker);
    setPosition((prevPosition) => ({
      ...prevPosition,
      coordinates: marker.coordinates,
      zoom: zoomLevels[zoomLevels.length - 1],
    }));
    setShowCard(true);
  }, []);

  const handleCountryClick = useCallback((geo: any) => {
    const centroid = geoCentroid(geo);
    setPosition({
      coordinates: centroid as [number, number],
      zoom: 2,
    });
    setShowCard(false);
    setFocusedMarker(null);
    setSelectedMarker(null);
    setSelectedGeo(geo.properties.name);
  }, []);

  const handleStateClick = useCallback((geo: any) => {
    const centroid = geoCentroid(geo);
    setPosition({
      coordinates: centroid as [number, number],
      zoom: 4,
    });
    setShowCard(false);
    setFocusedMarker(null);
    setSelectedMarker(null);
    setSelectedGeo(geo.properties.name);
  }, []);

  const scaledMarkers = useMemo(() => {
    return markers.map((marker, index) => (
      <Marker key={index} coordinates={marker.coordinates}>
        <circle
          r={markerSizes[position.zoom] || 3 / Math.sqrt(position.zoom)}
          fill={
            selectedMarker && selectedMarker.ip === marker.ip
              ? "#09ff5f85"
              : colorScale(index)
          }
          stroke="#FFF"
          strokeWidth={0.4 / position.zoom}
          style={{
            cursor: "pointer",
            transition: "all 0.3s ease-in-out",
            outline: "none",
          }}
          data-tooltip-id="marker-tooltip"
          onMouseEnter={() => {
            setTooltipContent(
              `IP: ${marker.ip}<br/>Country: ${marker.country}<br/>ISP: ${marker.isp}`
            );
          }}
          onMouseLeave={() => {
            setTooltipContent("");
          }}
          onClick={() => handleMarkerClick(marker)}
        />
      </Marker>
    ));
  }, [markers, position.zoom, markerSizes, handleMarkerClick, selectedMarker]);

  const handleRecenter = useCallback(() => {
    setPosition({
      coordinates: [0, 0],
      zoom: 1,
    });
    setSelectedGeo(null);
  }, []);

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
                  fill={"#1F2937"}
                  style={{
                    default: { outline: "none" },
                    hover: {
                      outline: "none",
                      fill: "#2C3E50",
                      cursor: "pointer",
                    },
                    pressed: { outline: "none", fill: "#4CAF50" },
                  }}
                  stroke="#EAEAEC"
                  strokeWidth={0.2}
                  onClick={() => handleCountryClick(geo)}
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
                  fill={"#1F2937"}
                  style={{
                    default: { outline: "none" },
                    hover: {
                      outline: "none",
                      fill: "#2C3E50",
                      cursor: "pointer",
                    },
                    pressed: { outline: "none" },
                  }}
                  stroke="#EAEAEC"
                  strokeWidth={0.2}
                  onClick={() => handleStateClick(geo)}
                />
              ))
            }
          </Geographies>
          {scaledMarkers}
        </ZoomableGroup>
      </ComposableMap>

      <div
        className="flex flex-row justify-between items-center gap-4"
        style={{ position: "absolute", right: "1rem", top: "1rem" }}
      >
        <button
          onClick={handleZoomIn}
          className=" bg-white text-black rounded-full w-6 h-6 mx-auto my-auto  "
        >
          +
        </button>
        <button
          onClick={handleRecenter}
          className="bg-white text-black rounded-full w-6 h-6 mx-auto my-auto"
        >
          ⌂
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-white text-black rounded-full w-6 h-6 mx-auto my-auto"
        >
          -
        </button>
      </div>
      <Tooltip id="marker-tooltip" html={tooltipContent} />
      {showCard && focusedMarker && (
        <div
          style={{
            position: "absolute",
            left: "1rem",
            bottom: "1rem",
            background: "black",
            padding: "1rem",
            borderRadius: "0.5rem",
          }}
        >
          <h3>Node Details</h3>
          <p>IP: {focusedMarker.ip}</p>
          <p>Country: {focusedMarker.country}</p>
          <p>ISP: {focusedMarker.isp}</p>
          <button onClick={() => setShowCard(false)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default MapView;
