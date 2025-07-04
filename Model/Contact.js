const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true
    },
    phone:{
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    
    }
});

const Contact = mongoose.model('contact', contactSchema);
module.exports = Contact;