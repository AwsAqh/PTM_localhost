const bcrypt = require('bcryptjs');
const jwt=require("jsonwebtoken")
const User=require("../models/users")
const nodemailer = require('nodemailer');
const dotenv=require("dotenv")

dotenv.config()

const secretKey="a secret key"

const transporter = nodemailer.createTransport({
    service: 'gmail',    
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

exports.register=async(req,res)=>{
    console.log("inside register")
    const {name,email,password}=req.body

    // Input validation
    if (!name || !email || !password) {
        return res.status(400).json({ 
            msg: "Missing required fields",
            details: {
                name: !name ? "Name is required" : null,
                email: !email ? "Email is required" : null,
                password: !password ? "Password is required" : null
            }
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ msg: "Invalid email format" });
    }

    if (password.length < 6) {
        return res.status(400).json({ msg: "Password must be at least 6 characters long" });
    }

    try{
        const userExist=await User.findOne({email})
        if(userExist) return res.status(400).json({msg:"user already exists!"})

            const hashedPassword=await bcrypt.hash(password,10)
               const newUser=new User({
                name,
                email,
                password:hashedPassword
               }) 
               await newUser.save()
        const token=jwt.sign({userid:newUser._id},secretKey,{expiresIn:"24h"})  
        res.status(201).json({
            msg: "Registration successful",
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
        })     

    }catch(err){
        console.error("Registration error:", err);

        // Handle specific MongoDB errors
        if (err.code === 11000) {
            return res.status(400).json({ 
                msg: "Email already exists",
                error: "DUPLICATE_EMAIL"
            });
        }

        if (err.name === 'ValidationError') {
            return res.status(400).json({
                msg: "Validation error",
                details: Object.keys(err.errors).reduce((acc, key) => {
                    acc[key] = err.errors[key].message;
                    return acc;
                }, {})
            });
        }

        // Generic error response
        res.status(500).json({
            msg: "Error while registering",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

}



exports.login=async (req,res)=>{
 
    if(!req.body.email || !req.body.password) return res.status(400).json({msg:"missing email or password"})
        const {email,password}=req.body

try{
        
    const checkUser=await User.findOne({email})
    if(!checkUser) res.status(401).json({msg:"email does not exist"})
    const isMatch=await bcrypt.compare(password,checkUser.password)
    if( isMatch){
        console.log(" info matched !!")
        const token=jwt.sign({userId:checkUser._id},secretKey,{expiresIn:"24h"})
        res.status(200).json({token})}
    else res.status(401).json({msg:"Email or password error"})

}
catch(err){
    console.log(err);
    return res.status(500).json({ msg: 'Server error' });

}


}

exports.checkEmailExists=async(req,res)=>{

    const {email}=req.body
    const user =await User.findOne({email})
    console.log(user)
    if(!user)return res.status(404).json({message:"user  not found!"})
        return res.status(200).json({})


}


exports.forgotPassword=async(req,res)=>{
    const {email}=req.body
    console.log(email)
    const user=await User.findOne({email})
    console.log(user)
    if(!user) return res.status(404).json({message:"user not found"})
        console.log("creating pin ........")
    const pin=Math.floor(100000+Math.random()*900000).toString()

    user.resetPasswordPin=pin
    user.resetPasswordExpires=Date.now()+10*60*1000
    await user.save()


    const mailOptions={
        from:process.env.SMTP_USER,
        to:email,
        subject:"Password Reset Request",
        text:`Your password reset pin is ${pin} , if you did not request this, please ignore this email`
    }

    try{
        await transporter.sendMail(mailOptions)
        res.status(200).json({message:"Password reset pin sent to email"})
    }
    catch(err){
        console.log(err)
        res.status(500).json({message:"Error sending email"})
    }

}

exports.confirmPin=async(req,res)=>{

    const {email,pin}=req.body
    
try{
    const user=await User.findOne({email})
   
    if(!user) return res.status(404).json({message:"user not found"})

        if(user.resetPasswordPin!==pin || user.resetPasswordExpires<Date.now()){
           return res.status(400).json({msg:"Invalid pin , or pin expired"})
        }
       return res.status(200).json({ message:"correct pin"})
    }catch(err){
        return res.status(500).json({message:"something went wrong"})
    }
}

exports.resetPassword=async(req,res)=>{

    const { email, pin, password } = req.body;
   console.log("recived data : ", email,pin,password)
   try{
   const user=await User.findOne({email})

   console.log(user)
   if(!user)return  res.status(404).json({message:"user not found"})

    if(user.resetPasswordPin!== pin ){
       
        return res.status(400).json({message:"Invalid pin , or pin expired"})
     }
    if(password.length<6) return res.status(400).json({message:"password must be at least 6 characters long"})


        console.log("password is ressting")
    const newPassword=await bcrypt.hash(password,10)
    user.password=newPassword
    user.resetPasswordPin=null
    user.resetPasswordExpires=null
    await user.save()
   return  res.status(200).json({message:"password reset successfully"})
   }
   catch(err){
    console.log(err)
    return res.status(500).json({message:"something went wrong..."})
   }
}
