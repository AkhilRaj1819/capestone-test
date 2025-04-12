const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    storageRef: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        default: ''
    }
});

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true
    },
    email:{
        type:String,
        required:true,
        match: [/.+@.+\..+/, 'Please enter a valid email address']
    },
    password:{
        type:String,
        required:true
    },
    files: [fileSchema]
})

const User = mongoose.model('User',userSchema);

module.exports=User