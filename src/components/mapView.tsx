import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
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
import { geoBounds, geoCentroid } from "d3-geo";
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

const BackgroundRect = ({
  text,
  fontSize,
  padding,
}: {
  text: string;
  fontSize: number;
  padding: number;
}) => {
  const ref = useRef<SVGTextElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const bbox = ref.current.getBBox();
      setWidth(bbox.width);
    }
  }, [text]);

  return (
    <>
      <text ref={ref} fontSize={fontSize} style={{ visibility: "hidden" }}>
        {text}
      </text>
      <rect
        x={-(width / 2 + padding / 2)}
        y={-7}
        width={width + padding}
        height={15}
        fill="rgba(0, 0, 0, 0.928)"
        rx={4}
      />
    </>
  );
};

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
  const [currentAnnotation, setCurrentAnnotation] = useState<{
    coordinates: [number, number];
    name: string;
    fontSize: number;
  } | null>(null);

  const [currentStateAnnotation, setCurrentStateAnnotation] = useState<{
    coordinates: [number, number];
    name: string;
    fontSize: number;
  } | null>(null);

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

  const nodeCountsByLocation = useMemo(() => {
    const counts: { [key: string]: number } = {};
    markers.forEach((marker) => {
      counts[marker.country] = (counts[marker.country] || 0) + 1;
    });
    return counts;
  }, [markers]);

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

  const calculateFontSize = (geo: any) => {
    const [[x0, y0], [x1, y1]] = geoBounds(geo);
    const width = Math.abs(x1 - x0);
    const height = Math.abs(y1 - y0);
    const area = width * height;
    return Math.max(Math.min(Math.sqrt(area) * 0.1, 14), 8); // Adjust these values as needed
  };

  const scaledMarkers = useMemo(() => {
    return markers.map((marker, index) => (
      <Marker key={index} coordinates={marker.coordinates}>
        <circle
          pointerEvents={position.zoom >= 2 ? "all" : "none"}
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

  const handleCloseCard = () => {
    setShowCard(false);
    setSelectedMarker(null);
  };
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapDimensions, setMapDimensions] = useState({
    width: 800,
    height: 600,
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (mapContainerRef.current) {
        setMapDimensions({
          width: mapContainerRef.current.offsetWidth,
          height: mapContainerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);
  return (
    <div
      ref={mapContainerRef}
      className="border border-white overflow-hidden"
      style={{
        width: "98%",
        height: "89vh",
        background: "#111827",
        position: "relative",
      }}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: mapDimensions.width / 6,
          center: [0, 30],
        }}
        width={mapDimensions.width}
        height={mapDimensions.height}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={handleMoveEnd}
          translateExtent={[
            [-33, -mapDimensions.height + 440],
            [mapDimensions.width + 33, mapDimensions.height + 409],
          ]}
        >
          <Geographies geography={countries}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryName = geo?.properties?.NAME;

                return (
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
                    strokeWidth={position.zoom <= 4 ? 0.2 : 0.1}
                    onClick={() => handleCountryClick(geo)}
                    onMouseEnter={() => {
                      const centroid = geoCentroid(geo);
                      const fontSize = calculateFontSize(geo);
                      setCurrentAnnotation({
                        coordinates: centroid,
                        name: `${geo.properties.NAME}`,
                        fontSize,
                      });
                    }}
                    onMouseLeave={() => {
                      setCurrentAnnotation(null);
                    }}
                  />
                );
              })
            }
          </Geographies>

          {position.zoom >= 2 && (
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
                      pressed: { outline: "none", stroke: "#0080ff" },
                    }}
                    stroke="#EAEAEC"
                    strokeWidth={position.zoom <= 4 ? 0.2 : 0.1}
                    onClick={() => handleStateClick(geo)}
                    onMouseEnter={() => {
                      const centroid = geoCentroid(geo);
                      const fontSize = calculateFontSize(geo);
                      setCurrentStateAnnotation({
                        coordinates: centroid,
                        name: `${geo.properties.name}`,
                        fontSize,
                      });
                    }}
                    onMouseLeave={() => {
                      setCurrentStateAnnotation(null);
                    }}
                  />
                ))
              }
            </Geographies>
          )}

          {scaledMarkers}

          {currentAnnotation && position.zoom <= 2 && (
            <Annotation
              subject={currentAnnotation.coordinates}
              dx={0}
              dy={-7}
              connectorProps={{
                stroke: "transparent",
                strokeWidth: 0,
              }}
              z={99}
            >
              <g pointerEvents="none">
                <BackgroundRect
                  text={currentAnnotation.name}
                  fontSize={8}
                  padding={10}
                />
                <text
                  x={0}
                  y={1}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fill="#8dc6ff"
                  fontSize={8}
                  style={{ pointerEvents: "none" }}
                >
                  {currentAnnotation.name}
                </text>
              </g>
            </Annotation>
          )}

          {currentStateAnnotation &&
            position.zoom >= 2 &&
            position.zoom < 8 && (
              <Annotation
                subject={currentStateAnnotation.coordinates}
                dx={0}
                dy={-4}
                connectorProps={{
                  stroke: "transparent",
                  strokeWidth: 0,
                }}
                z={99}
              >
                <g pointerEvents="none">
                  <rect
                    x={-20}
                    y={-9}
                    width={40}
                    height={8}
                    fill="rgba(0, 0, 0, 0.859)"
                    rx={2}
                  />
                  <text
                    x={0}
                    y={-5}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fill="#8dc6ff"
                    fontSize={5}
                    style={{ pointerEvents: "none" }}
                  >
                    {currentStateAnnotation.name}
                  </text>
                </g>
              </Annotation>
            )}
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
      {position.zoom > 2 && (
        <Tooltip id="marker-tooltip" html={tooltipContent} />
      )}

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
          <button className="absolute top-1 right-4 " onClick={handleCloseCard}>
            X
          </button>
        </div>
      )}
    </div>
  );
};

export default MapView;
