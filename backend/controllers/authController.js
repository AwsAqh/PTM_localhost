const bcrypt = require('bcryptjs');
const jwt=require("jsonwebtoken")
const User=require("../models/users")


const secretKey="a secret key"


exports.register=async(req,res)=>{
    console.log("inside register")
    const seceretKey="a secret key"
    const {name,email,password}=req.body
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
        res.status(201).json({token})     

    }catch(err){
        console.error(err);
        res.status(500).json({msg:"error while registering."})

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