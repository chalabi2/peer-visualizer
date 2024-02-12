# Cosmos Peer Visualizer

This project is a web application that visualizes the peers of a cosmos network. It is built using [Next.js](https://nextjs.org/), [Tailwind CSS](https://tailwindcss.com/), and [MongoDB](https://www.mongodb.com/).

## Getting Started

First, in a seperate terminal initiate the mongodb server by running the following command:

```bash
mkdir data && mongod --port 27017 --dbpath data/
```

Second, create and populate the .env file with the following environment variables:

```bash
MONGODB_URI=mongodb://localhost:27017/mydatabase
NODE_IP= <IP_ADDRESS:PORT> # this should be an open rpc for any cosmos network
```

Third, install the dependencies & run the development server:

`bun install && bun run dev`

Please allow for the database to popuplate. This may take a few minutes depending on how many nodes are accesible at the moment.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## To do

Currently there is only a 2d table view displaying the Countries, ISP's in that country, and the number of peers or nodes within that ISP. The next steps are to create a 3d visualization of the network.
