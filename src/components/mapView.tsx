import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Peer } from "@/app/types";
interface MapViewProps {
  peers: Peer[];
}

const MapView: React.FC<MapViewProps> = ({ peers }) => {
  return (
    <MapContainer style={{ height: "400px", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {peers.map((peer, index) => (
        <Marker key={index} position={[peer.lat ?? 0, peer.lon ?? 0]}>
          <Popup>{peer.isp}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapView;
