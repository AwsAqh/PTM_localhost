const mongoose=require("mongoose");


const  modelSchema=new mongoose.Schema({

    name:{type:String,require:true},
    modelNameOnCloud:{type:String ,require:true },
    modelDescription:{type:String},
    path:{type:String,require:true},
    cloudPath:{type:String,require:true},
    classes:{type:[String],require:true},
    modelArcheticture:{type:String},
    modelCategory:{type:String},
    dataset:{type:String},
    featureImage:{type:String},
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