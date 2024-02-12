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

// Updated fetchPeerInfo function to accept full URL
const fetchPeerInfo = async (url: string): Promise<PeerInfo[]> => {
    try {
      const { data } = await axiosInstance.get(url);
      return data.result.peers.map((peer: any) => ({
        ip: peer.remote_ip,
        rpcAddress: peer.node_info.other.rpc_address,
      }));
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
          const additionalPeers = await fetchPeerInfo(urlToFetch);
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



async function updateDatabaseWithPeerInfo() {
    dbConnect()
    // Your logic to fetch peer information and store it in the database
    const initialUrl = `http://${process.env.NODE_IP}/net_info`; // Adjust as necessary
    const initialPeers = await fetchPeerInfo(initialUrl);
    const allPeers = await followRpcAddresses(initialPeers, new Set());
    const uniqueIPs = [...new Set(allPeers.map(peer => peer.ip))];
    const peersWithGeo = await fetchGeoInfoBatch(uniqueIPs);
  
    // Consider using upserts or more sophisticated logic to avoid duplicates
    await PeerInfo.deleteMany(); // Be cautious with this in a production environment
    await PeerInfo.insertMany(peersWithGeo);
  
    console.log('Database updated with the latest peer information');
  }
  
  async function ensureDatabaseIsPopulated() {
    await dbConnect();
    const count = await PeerInfo.countDocuments();
    if (count === 0) {
      console.log('Database is empty. Populating now...');
      await updateDatabaseWithPeerInfo();
    } else {
      console.log(`Database already populated with ${count} records.`);
    }
  }
  
  // Run the check once at the start
  ensureDatabaseIsPopulated();
  // Schedule the database update to run every 12 hours
  cron.schedule('0 */12 * * *', async () => {
    console.log('Updating database with the latest peer information...');
    await updateDatabaseWithPeerInfo();
  });
  
  export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log('Api queryNode called');
    await dbConnect(); // Ensure the database connection is established
  
    // Now, it's safe to perform database operations
    const peers = await PeerInfo.find();
    res.status(200).json(peers);
  }