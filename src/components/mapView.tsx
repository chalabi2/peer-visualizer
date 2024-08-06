import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
  useReducer,
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
import { debounce } from "lodash";

const zoomLevels = [1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64];

interface IMarker {
  ip: string;
  country: string;
  isp: string;
  coordinates: [number, number];
}

interface IPosition {
  coordinates: [number, number];
  zoom: number;
}

const initialPosition: IPosition = {
  coordinates: [0, 0],
  zoom: 1,
};

type PositionAction =
  | { type: "ZOOM_IN" }
  | { type: "ZOOM_OUT" }
  | { type: "MOVE"; payload: IPosition }
  | { type: "RESET" }
  | { type: "SET"; payload: IPosition };

const positionReducer = (
  state: IPosition,
  action: PositionAction
): IPosition => {
  switch (action.type) {
    case "ZOOM_IN": {
      const nextZoomIndex = zoomLevels.findIndex((z) => z > state.zoom);
      return {
        ...state,
        zoom: nextZoomIndex !== -1 ? zoomLevels[nextZoomIndex] : state.zoom,
      };
    }
    case "ZOOM_OUT": {
      const nextZoomIndex = zoomLevels.findIndex((z) => z >= state.zoom) - 1;
      return {
        ...state,
        zoom: nextZoomIndex >= 0 ? zoomLevels[nextZoomIndex] : state.zoom,
      };
    }
    case "MOVE":
      return action.payload;
    case "RESET":
      return initialPosition;
    case "SET":
      return action.payload;
    default:
      return state;
  }
};

const MapView = ({ groupedPeers }: { groupedPeers: IGroupedPeers }) => {
  const [position, dispatchPosition] = useReducer(
    positionReducer,
    initialPosition
  );
  const [tooltipContent, setTooltipContent] = useState("");
  const [selectedMarker, setSelectedMarker] = useState<IMarker | null>(null);
  const [focusedMarker, setFocusedMarker] = useState<IMarker | null>(null);
  const [showCard, setShowCard] = useState(false);

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
    dispatchPosition({ type: "ZOOM_IN" });
  }, []);

  const handleZoomOut = useCallback(() => {
    dispatchPosition({ type: "ZOOM_OUT" });
  }, []);

  const handleMoveEnd = useCallback(
    (pos: { coordinates: [number, number]; zoom: number }) => {
      dispatchPosition({ type: "MOVE", payload: pos });
    },
    []
  );

  const handleMarkerClick = useCallback((marker: IMarker) => {
    setFocusedMarker(marker);
    setSelectedMarker(marker);
    dispatchPosition({
      type: "SET",
      payload: {
        coordinates: marker.coordinates,
        zoom: zoomLevels[zoomLevels.length - 1],
      },
    });
    setShowCard(true);
  }, []);

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
    dispatchPosition({ type: "RESET" });
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

  const handleCountryClick = useCallback(
    (geo: any) => {
      const centroid = geoCentroid(geo);
      const bounds = geoBounds(geo);
      const dx = bounds[1][0] - bounds[0][0];
      const dy = bounds[1][1] - bounds[0][1];
      const area = dx * dy;

      const largeCountryThreshold = 100;
      const maxZoomForLargeCountries = 2;
      let zoom =
        0.9 / Math.max(dx / mapDimensions.width, dy / mapDimensions.height);

      if (area > largeCountryThreshold) {
        zoom = Math.min(zoom, maxZoomForLargeCountries);
      } else {
        zoom = Math.min(zoom, 8);
      }

      const closestZoom = zoomLevels.reduce((prev, curr) =>
        Math.abs(curr - zoom) < Math.abs(prev - zoom) ? curr : prev
      );

      dispatchPosition({
        type: "SET",
        payload: {
          coordinates: centroid as [number, number],
          zoom: closestZoom,
        },
      });
      setShowCard(false);
      setFocusedMarker(null);
      setSelectedMarker(null);
    },
    [mapDimensions]
  );

  const handleStateClick = useCallback(
    (geo: any) => {
      const centroid = geoCentroid(geo);
      const bounds = geoBounds(geo);
      const dx = bounds[1][0] - bounds[0][0];
      const dy = bounds[1][1] - bounds[0][1];
      const zoom = Math.min(
        16,
        0.9 / Math.max(dx / mapDimensions.width, dy / mapDimensions.height)
      );

      dispatchPosition({
        type: "SET",
        payload: {
          coordinates: centroid as [number, number],
          zoom: zoom,
        },
      });
      setShowCard(false);
      setFocusedMarker(null);
      setSelectedMarker(null);
    },
    [mapDimensions]
  );

  useEffect(() => {
    const updateDimensions = debounce(() => {
      if (mapContainerRef.current) {
        setMapDimensions({
          width: mapContainerRef.current.offsetWidth,
          height: mapContainerRef.current.offsetHeight,
        });
      }
    }, 200);

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const CenteredAnnotation = ({
    geo,
    name,
    zoom,
  }: {
    geo: any;
    name: string;
    zoom: number;
  }) => {
    const centroid = geoCentroid(geo);
    const [[x0, y0], [x1, y1]] = geoBounds(geo);
    const area = Math.abs((x1 - x0) * (y1 - y0));

    const minAreaThreshold = 10 / (zoom * zoom);
    const isCountry =
      geo?.properties?.TYPE === "Country" ||
      geo?.properties?.type === "Country" ||
      geo?.properties?.type === "Sovereign country" ||
      geo?.properties?.TYPE === "Sovereign country";
    const isBigCountry =
      isCountry &&
      geo?.properties?.NAME != "France" &&
      geo?.properties?.NAME != "Chile" &&
      geo?.properties?.NAME != "Netherlands" &&
      area > 1000;

    if (area < minAreaThreshold) {
      return null;
    }

    return (
      <Annotation
        subject={centroid}
        dx={
          isCountry && geo?.properties?.NAME === "France"
            ? 35
            : 0 ||
              (isCountry &&
                geo?.properties?.NAME === "United States of America")
            ? 20
            : 0 || (isCountry && geo?.properties?.NAME === "Canada")
            ? -60
            : 0
        }
        dy={
          isCountry && geo?.properties?.NAME === "France"
            ? -20
            : 0 ||
              (isCountry &&
                geo?.properties?.NAME === "United States of America")
            ? 30
            : 0
        }
        connectorProps={{
          stroke: "transparent",
          strokeWidth: 0,
        }}
      >
        <g pointerEvents="none">
          <text
            textAnchor="middle"
            alignmentBaseline="middle"
            fill="#8dc6ff9f"
            fontSize={isBigCountry ? 15 : 22 / (zoom * 3)}
            opacity={0.7}
            style={{ pointerEvents: "none" }}
          >
            {name}
          </text>
        </g>
      </Annotation>
    );
  };

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
          <Geographies geography={"/combinedTest3.geojson"}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = geo?.properties?.NAME || geo?.properties?.name;
                const isState =
                  geo?.properties?.TYPE ||
                  geo?.properties?.type === "State" ||
                  "Province";
                const isCountry =
                  geo?.properties?.TYPE === "Country" ||
                  geo?.properties?.type === "Country" ||
                  geo?.properties?.type === "Sovereign country" ||
                  geo?.properties?.TYPE === "Sovereign country";

                const shouldRender =
                  (isCountry && position.zoom <= 2) ||
                  (isState && position.zoom > 2) ||
                  (isCountry && !isState);

                return shouldRender ? (
                  <React.Fragment key={geo.rsmKey}>
                    <Geography
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
                      onClick={() =>
                        isCountry
                          ? handleCountryClick(geo)
                          : handleStateClick(geo)
                      }
                    />
                    <CenteredAnnotation
                      geo={geo}
                      name={name}
                      zoom={position.zoom}
                    />
                  </React.Fragment>
                ) : null;
              })
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
