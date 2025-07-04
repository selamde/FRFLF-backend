const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
   
    name: {
         type: String, 
         required: true },
    email: {
         type: String,  
         unique: true },
    password: {
         type: String, 
        required: true },
    role: { 
        type: String, 
        enum: ['admin', 'police', 'operator'], 
        required: true },
     image:{
            type: String,
            required:true,
        },
});

const userModel = mongoose.model('user', userSchema);
module.exports = userModel;