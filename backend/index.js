const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose')
app.use(cors());
app.use(express.json());
require('dotenv').config();
const PORT = process.env.PORT || 5000;
const STRING = process.env.MONGODB_URI;

const router = require("./controller/router.js")
app.use('/route',router)
app.listen(PORT,async ()=>{
    try {
        await mongoose.connect(STRING);
        console.log("connected to database")
    } catch (error) {
        console.log(error);
    }
console.log(`Running on port ${PORT}`);
})
