const bcrypt = require('bcryptjs');
const jwt=require("jsonwebtoken")
const User=require("../models/users")


const secretKey="a secret key"


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
        const token=jwt.sign({userid:newUser._id},secretKey,{expiresIn:"1h"})  
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
   console.log("inside login")
    if(!req.body.email || !req.body.password) return res.status(400).json({msg:"missing email or password"})
        const {email,password}=req.body
console.log("login body: ", email , password)
try{
        
    const checkUser=await User.findOne({email})
    if(!checkUser) res.status(401).json({msg:"email does not exist"})
    const isMatch=await bcrypt.compare(password,checkUser.password)
    if( isMatch){
        console.log(" info matched !!")
        const token=jwt.sign({userId:checkUser._id},secretKey,{expiresIn:"1h"})
        res.status(200).json({token})}
    else res.status(401).json({msg:"Email or password error"})

}
catch(err){
    console.log(err);
    return res.status(500).json({ msg: 'Server error' });

}


}