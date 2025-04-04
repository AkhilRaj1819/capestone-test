const express = require('express')
const router = express.Router();
const User = require('../schema/schema.js')
const bcrypt = require('bcrypt');
router.post('/signup',async (req,res)=>{
    try {
        const {username , email,password}= req.body;
        if(!username||!email||!password){
            res.status(400).send({msg:"enter all fields"});
            return;
        }
        const validusername = await User.findOne({username});
        const validuser = await User.findOne({email});
        if(validusername){
            res.status(409).send({msg:"username already exist"});
            return;
        }
        if(validuser){
            res.status(409).send({msg:"user already exist"});
        }
        const hashpassword = await bcrypt.hash(password,13)
        const newUser = new User({username , email,password:hashpassword})
        const savedUser = await newUser.save();
        res.status(200).send({msg:"User created sucessfully",data:savedUser});
    } catch (error) {
        res.status(500).send({msg:"something went wrong",error});
    }
})

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(409).send({ msg: "Email does not exist. Try using a different email." });
        }

        // Compare the provided password with the hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).send({ msg: "Incorrect password" });
        }

        // Successful login
        res.status(200).send({ msg: "Login successful", user });
    } catch (error) {
        console.error(error);
        res.status(500).send({ msg: "Something went wrong", error });
    }
});

module.exports=router;