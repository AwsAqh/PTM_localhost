
const mongoose=require("mongoose");

const userSchema =new mongoose.Schema({
name : {type: String , require:true},
email : {type :String, require:true , unique:true},
password : {type : String , require :true},
createdAt: {
    type: Date,
    default: Date.now,
  },
  resetPasswordPin:  {type: String, default: null},
  resetPasswordExpires: {type: Date, default: null},


})

const User =mongoose.model("User",userSchema)
module.exports=User