const express = require('express')
const router = express.Router();
const User = require('../model/schema.js')
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
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

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(409).send({ msg: "Email does not exist. Try using a different email." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).send({ msg: "Incorrect password" });
        }

        res.status(200).send({ msg: "Login successful", user });
    } catch (error) {
        console.error(error);
        res.status(500).send({ msg: "Something went wrong", error });
    }
});
const Otp = require('../model/otp.js')
router.post('/forgotpassword', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).send({ msg: "Email field is required." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send({ msg: "Invalid email, try another one." });
        }

        const otp = Math.floor(1000 + Math.random() * 9000); 
        await Otp.deleteMany({ email }); 
        const newOtp = new Otp({ email, otp });
        await newOtp.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'akhil031215n@gmail.com',
                pass:'qvzb rstr ednk vxya'
            },
        });

        const mailOptions = {
            from:  'akhil031215n@gmail.com',
            to: email,
            subject: "Reset Your Password",
            text: `Your OTP for password reset is: ${otp}\n\nThis OTP is valid for 5 minutes.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error while sending email:', error);
                return res.status(500).send({ msg: "Failed to send OTP email.", error: error.message });
            }
            console.log('Email sent successfully:', info.response);
            res.status(200).send({ msg: "OTP generated and sent successfully." });
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        res.status(500).send({ msg: "Something went wrong.", error: error.message });
    }
});

router.post('/verifyotp', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).send({ msg: "All fields are required." });
        }

        const validOtp = await Otp.findOne({ email, otp });
        if (!validOtp) {
            return res.status(400).send({ msg: "Invalid OTP. Please try again." });
        }

        const now = new Date();
        const createdAt = validOtp.createdAt;
        const expiryTime = new Date(createdAt.getTime() + 5 * 60 * 1000); 
        if (now > expiryTime) {
            return res.status(400).send({ msg: "OTP has expired. Please request a new one." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 13);

        await User.findOneAndUpdate({ email }, { password: hashedPassword });

        await Otp.deleteMany({ email });

        res.status(200).send({ msg: "Password updated successfully." });
    } catch (error) {
        console.error('Unexpected Error:', error);
        res.status(500).send({ msg: "Something went wrong.", error: error.message });
    }
});

module.exports = router;

module.exports = router;

module.exports=router;