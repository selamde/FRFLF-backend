const mongoose = require('mongoose');

const CameraSchema = new mongoose.Schema({
    cameraName: { type: String, required: true },
    ipAddress: { type: String, required: true, unique: true },
    port: { type: String, default: "" },  // Optional port number
    location: { type: String },
    addedAt: { type: Date, default: Date.now }
});

const CameraModel = mongoose.model("cameras", CameraSchema);
module.exports = CameraModel;
