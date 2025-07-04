const mongoose = require('mongoose');

const CriminalSchema = new mongoose.Schema({
    cameraName: String,
    screenshotPath: String,
    date: Date,
    time: String,
});

const CriminalModel = mongoose.model("criminals", CriminalSchema);

module.exports = CriminalModel;