
const mongoose = require('mongoose');
const logSchema = new mongoose.Schema({
    adminId: String,
    adminName: String,
    action: String,
    target: String,
    description: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Log', logSchema);
