const mongoose=require("mongoose");


const  modelSchema=new mongoose.Schema({

    name:{type:String,require:true},
    path:{type:String,require:true},
    classes:{type:[String],require:true},
    dataset:{type:String},
   createdBy: {
        type: mongoose.Schema.Types.ObjectId,  
        ref: 'User',
        required: true
    },
    createdAt: {
    type: Date,
    default: Date.now,
  },


})
const Model=mongoose.model("model",modelSchema)
module.exports=Model