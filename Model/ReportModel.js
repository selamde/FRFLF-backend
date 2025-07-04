const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
   location: {
    type: String,
    required: true

    },
   photo: {
    type: String,
    required: true

    },
    description: {
        type: String,
        required: true

    },
    checked: {
        type: Boolean,
        default:false


    }


})

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;