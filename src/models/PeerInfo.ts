const mongoose = require('mongoose');

const PeerInfoSchema = new mongoose.Schema({
    ip: String,
    rpcAddress: String,
    network: String,
    country: String,
    isp: String,
    lat: String,
    lon: String,
  });

// Check if the model exists using mongoose.modelNames() which returns an array of all model names
const PeerInfo = mongoose.models.PeerInfo || mongoose.model('PeerInfo', PeerInfoSchema);

export default PeerInfo;
