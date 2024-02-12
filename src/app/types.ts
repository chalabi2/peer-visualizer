export interface Peer {
    ip: string;
    country: string;
    isp: string;
    lat?: number;
    lon?: number; 
  }
  
  export interface GroupedPeers {
    [country: string]: {
      totalIPs: number;
      isps: {
        [isp: string]: Peer[];
      };
    };
  }
  
  export interface ChartData {
    name: string;
    totalIPs: number;
  }