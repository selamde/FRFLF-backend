const mongoose = require('mongoose');

const FugitiveSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    charges: {
        type: String,
        required: true
    },
    imagePath: {
        type: String, 
        required: false
    },
    lastSeenLocation: {
        type: String,
        required: false
    },
    dob:{
        type: String,
        required:true
        
    },
    hair:{
        type: String,
        required:true
    },
    height:{
        type: String,
        required:true
    },
    gender:{
        type: String,
        required:true
    },
    nationality:{
        type: String,
        required:true
    },
    pob:{
        type: String,
        required:true
    },
    eyes:{
        type: String,
        required:true
    },
    weight:{
        type: String,
        required:true
    },
    caution:{
        type: String,
        required:true
    },
    dateAdded: {
        type: Date,
        default: Date.now
    }
});

const FugitiveModel = mongoose.model('Fugitive', FugitiveSchema);
module.exports = FugitiveModel;
