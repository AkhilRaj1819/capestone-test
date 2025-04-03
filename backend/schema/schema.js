const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true
    },
    email:{
        type:String,
        required:true,
        contains:'@'
    },
    password:{
        type:String,
        required:true
    }
})

const user = mongoose.model('user',userSchema);

module.exports=user