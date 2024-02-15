# Cosmos Peer Visualizer

This project is a web application that visualizes the peers of a cosmos network. It is built using [Next.js](https://nextjs.org/), [Tailwind CSS](https://tailwindcss.com/), and [MongoDB](https://www.mongodb.com/).

## Getting Started

First, in a separate terminal initiate the mongodb server by running the following command:

```bash
mkdir data && mongod --port 27017 --dbpath data/
```

Second, create and populate the .env file with the following environment variables:

```bash
MONGODB_URI=mongodb://localhost:27017/mydatabase
BERACHAIN_NET_INFO_URL=https://berachain-testnet-rpc.polkachu.com/net_info?
EVMOS_NET_INFO_URL=https://evmos-rpc.polkachu.com/net_info?
AKASH_NET_INFO_URL=https://akash-rpc.polkachu.com/net_info?
OSMOSIS_NET_INFO_URL=https://osmosis-rpc.polkachu.com/net_info?
CANTO_NET_INFO_URL=https://canto-rpc.polkachu.com/net_info?
INJECTIVE_NET_INFO_URL=https://injective-rpc.polkachu.com/net_info?
CELESTIA_NET_INFO_URL=https://celestia-rpc.polkachu.com/net_info?
DYMENSION_NET_INFO_URL=https://dymension-rpc.polkachu.com/net_info?
GRAVITY_NET_INFO_URL=https://gravity-rpc.polkachu.com/net_info?
QUICKSILVER_NET_INFO_URL=https://nodes.chandrastation.com/rpc/quicksilver/net_info?
```

Third, install the dependencies & run the development server:

`bun install && bun run dev`

Please allow for the database to populate. This may take a few minutes depending on how many nodes are accessible at the moment.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Data

Peer data is fetched recursively from nodes that are set in the .env file. This data may not be entirely accurate as it is dependent on the nodes that are accessible at the moment. Nodes included in the list could potentially no longer be active.

## To do

Create 3d visualization of peers.
Add liveness check for nodes, remove duds.
