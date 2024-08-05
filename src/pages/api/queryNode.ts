import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

import PeerInfo from '@/models/PeerInfo';
import cron from 'node-cron';
import dbConnect from '@/utils/dbConnect';


interface PeerInfo {
  ip: string;
  rpcAddress?: string;
}

interface PeerGeoInfo extends PeerInfo {
  country?: string;
  isp?: string;
  lat?: string;
    lon?: string;
}

const requestTimeout = 5000; // 5 seconds timeout for requests

// Custom axios instance with timeout
const axiosInstance = axios.create({
  timeout: requestTimeout,
});

const networks = {
  Berachain: process.env.BERACHAIN_NET_INFO_URL,
  Evmos: process.env.EVMOS_NET_INFO_URL,
  Akash: process.env.AKASH_NET_INFO_URL,
  Canto: process.env.CANTO_NET_INFO_URL,
  Osmosis: process.env.OSMOSIS_NET_INFO_URL,
  Injective: process.env.INJECTIVE_NET_INFO_URL,
  Celestia: process.env.CELESTIA_NET_INFO_URL,
  Dymension: process.env.DYMENSION_NET_INFO_URL,
  Gravity: process.env.GRAVITY_NET_INFO_URL,
  Quicksilver: process.env.QUICKSILVER_NET_INFO_URL,
  Sei: process.env.SEI_NET_INFO_URL,
  Cosmos: process.env.COSMOS_NET_INFO_URL,
  Althea: process.env.ALTHEA_NET_INFO_URL,
};


const parseSeiPeerInfo = (peerInfo: any): PeerInfo => {
  const urlParts = peerInfo.url.split('@')[1].split(':');
  const ip = urlParts[0];
  const port = urlParts[1];
  const rpcPort = port.slice(0, -1) + '7'; // Remove last digit and append '7'
  
  return {
    ip: ip,
    rpcAddress: `${ip}:${rpcPort}`,
  };
};

// Updated fetchPeerInfo function to accept full URL
const fetchPeerInfo = async (url: string, network?: string): Promise<PeerInfo[]> => {
  try {
    const { data } = await axiosInstance.get(url);
    console.log(`Raw response from ${url}:`, JSON.stringify(data, null, 2));

    if (network?.toUpperCase() === 'SEI' && Array.isArray(data)) {
      return data.map(parseSeiPeerInfo);
    } else if (data.result && Array.isArray(data.result.peers)) {
      return data.result.peers.map((peer: any) => ({
        ip: peer.remote_ip,
        rpcAddress: peer.node_info?.other?.rpc_address,
      }));
    } else if (data.peers && Array.isArray(data.peers)) {
      return data.peers.map((peer: any) => ({
        ip: peer.remote_ip || peer.addr,
        rpcAddress: peer.node_info?.other?.rpc_address || peer.rpc_address,
      }));
    } else {
      console.error(`Unexpected API response structure from ${url}:`, data);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching peer info from ${url}:`, error);
    return [];
  }
};

// Fetches geo information for a list of IPs
const fetchGeoInfoBatch = async (ips: string[]): Promise<PeerGeoInfo[]> => {
    const batchSize = 100; // IP-API allows up to 100 IPs per batch request
    let allGeoInfo: PeerGeoInfo[] = [];
  
    for (let i = 0; i < ips.length; i += batchSize) {
      const batch = ips.slice(i, i + batchSize);
      try {
        const response = await axiosInstance.post('http://ip-api.com/batch', batch.map(ip => ({ query: ip })), {
          headers: { 'Content-Type': 'application/json' }
        });
        const batchGeoInfo: PeerGeoInfo[] = response.data.map((info: any, index: number) => ({
          ip: batch[index],
          country: info.country,
          isp: info.isp,
          lat: info.lat,
          lon: info.lon,
        }));
        allGeoInfo = allGeoInfo.concat(batchGeoInfo);
      } catch (error) {
        console.error('Error fetching batch geo info:', error);
        // Proceed without throwing error to continue processing remaining batches
      }
    }
  
    return allGeoInfo;
  };
  

// Recursive function to follow the rpc_address for additional peers
const followRpcAddresses = async (initialPeerInfo: PeerInfo[], visited = new Set<string>()): Promise<PeerInfo[]> => {
  let allPeers: PeerInfo[] = [];

  for (const peerInfo of initialPeerInfo) {
    if (peerInfo.rpcAddress && !visited.has(peerInfo.rpcAddress)) {
      let urlToFetch = "";

      // Check if rpcAddress is 0.0.0.0
      if (peerInfo.rpcAddress.includes('0.0.0.0')) {
        // Use the remote_ip and preserve the port from rpcAddress
        const port = peerInfo.rpcAddress.split(':')[2]; // Extract the port
        urlToFetch = `http://${peerInfo.ip}:${port}/net_info`;
      } else if (!peerInfo.rpcAddress.includes('127.0.0.1')) {
        // Directly use rpcAddress if it's not localhost
        // Ensure rpcAddress is correctly formed without double http://
        const rpcIP = peerInfo.rpcAddress.replace(/^tcp:\/\//, '');
        urlToFetch = `http://${rpcIP}/net_info`;
      }

      if (urlToFetch && !visited.has(urlToFetch)) {
        console.log(`Fetching peer info from ${urlToFetch}`);
        visited.add(urlToFetch);

        try {
          const additionalPeers = await fetchPeerInfo(urlToFetch, );
          allPeers = allPeers.concat(await followRpcAddresses(additionalPeers, visited));
        } catch (error) {
          console.error(`Error following rpc_address ${urlToFetch}:`, error);
          // Continue with the next peer without throwing, to ensure robustness
        }
      }
    }
  }

  return allPeers.concat(initialPeerInfo); // Combine current peers with recursively found peers
};



async function updateDatabaseWithPeerInfo(network: string, url: string) {
  await dbConnect();

  const initialPeers = await fetchPeerInfo(url, network);
    const allPeers = await followRpcAddresses(initialPeers, new Set());
    const uniqueIPs = [...new Set(allPeers.map(peer => peer.ip))];
    const peersWithGeo = await fetchGeoInfoBatch(uniqueIPs);

    // Include the network in the peer information
    const peersWithNetwork = peersWithGeo.map(peer => ({ ...peer, network }));

    // Update database with new or updated peer information
    for (const peer of peersWithNetwork) {
        await PeerInfo.updateOne(
            { ip: peer.ip, network: peer.network }, // Filter with network
            { $set: peer }, // Update
            { upsert: true } // Option to insert if not exists
        );
    }

    console.log(`Database updated with the latest peer information for ${network}.`);
}

  
async function ensureDatabaseIsPopulated() {
  await dbConnect();

  // Define networks and their respective URLs from the environment variables
  
  // Iterate through each network to check and populate data if necessary
  for (const [network, url] of Object.entries(networks)) {
      const count = await PeerInfo.countDocuments({ network });

      if (count === 0) {
          console.log(`Database is empty for ${network}. Populating now...`);
          await updateDatabaseWithPeerInfo(network, url ?? '');
      } else {
          console.log(`Database already populated with ${count} records for ${network}.`);
      }
  }
}
  // Run the check once at the start
  ensureDatabaseIsPopulated();
  // Schedule the database update to run every 12 hours

  
  async function scheduleNetworkUpdates() {
    // Ensure database is initially populated for all networks
    await ensureDatabaseIsPopulated();
  
    // Define networks and their respective URLs from the environment variables

  
    // Schedule database updates for each network
    Object.entries(networks).forEach(([network, url]) => {
      // Schedule the database update to run every 12 hours for each network
      cron.schedule('0 */12 * * *', async () => {
        console.log(`Updating database with the latest peer information for ${network}...`);
        await updateDatabaseWithPeerInfo(network, url ?? '');
      });
    });
  }
  
  scheduleNetworkUpdates();
  
  export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { network } = req.query; // Extract network from query parameters
    console.log(`Api queryNode called for ${network}`);
    await dbConnect();

    const peers = await PeerInfo.find({ network: network }); // Fetch peers for the specified network
    res.status(200).json(peers);
}