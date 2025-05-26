const multer = require('multer');
const cloudinary = require('../cloudinaryConfig'); 

const axios = require('axios');
const uuid = require('uuid'); 
const Model=require("../models/models");
const User=require("../models/users");

const storage = multer.memoryStorage();

const python_api_url=process.env.Python_API_Server
const upload = multer({ storage });

const handleTrainNewModel = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded.' });
  }

  const classesCount = parseInt(req.body.classesCount, 10);
  let classNames = [];
  const modelArch=req.body.modelArch
  const modelCategory=req.body.category
  const uniqueModelId =  uuid.v4().slice(0, 8);  

  
  const modelNameWithUniqueId = `${req.body.modelName}_${uniqueModelId}`;  

  // Upload images to Cloudinary and process the files
  for (let i = 0; i < classesCount; i++) {
    const className = req.body[`class_name_${i}`];
    if (!className) {
      return res.status(400).json({ message: `Missing class name for class_${i}` });
    }
    classNames.push(className);

    // Filter files that belong to this class
    const classFiles = req.files.filter(file => file.fieldname === `class_dataset_${i}`);

    if (classFiles && classFiles.length > 0) {
      classFiles.forEach((file) => {
        // Create a unique folder for each model using model name + unique model ID
        const modelFolder = `dataset/${modelNameWithUniqueId}/${className}`;
        
      
        cloudinary.uploader.upload_stream({
          folder: modelFolder,  
          public_id: `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`,
        }, (err, result) => {
          if (err) {
            return res.status(500).json({ message: 'Error uploading to Cloudinary', error: err });
          } else {
            console.log('File uploaded to Cloudinary:', result.secure_url);
          }
        }).end(file.buffer); // Upload file buffer to Cloudinary
      });
    } else {
      console.log(`No files for class_${i}`);
    }
  }

 
  try {
    console.log("Trying to train with model name:", modelNameWithUniqueId);
    
    const response = await axios.post(`${python_api_url}/train`, {
      modelName: modelNameWithUniqueId,  
      classes: classNames,
      modelArch,
    });
    const modelPath = response.data.modelPath;  
    
    console.log('Training Response:', response.data);
    
    console.log("Model path:", modelPath);
    try {
      console.log(" id id :" , req.userId)
      const newModel = new Model({
          name: req.body.modelName,
          modelNameOnCloud: modelNameWithUniqueId,
          modelDescription: req.body.modelDescription,
          path: "./models/" + modelPath,
          classes: classNames,
          modelArcheticture: modelArch,
          modelCategory: modelCategory,
          createdBy: req.userId
      });
      const savedModel = await newModel.save();
      res.json({
        message: 'Model trained successfully!',
        modelName: modelNameWithUniqueId, 
        classNames: classNames,
        modelPath: modelPath,
        modelId: savedModel._id
      });
    } catch (error) {
      console.log("Error saving model document:", error);
      res.status(500).json({ message: 'Error saving model document', error: error.message });
    }
  } catch (error) {
    console.error('Error triggering training:', error);
    res.status(500).json({ message: 'Error starting model training', error: error.message });
  }
};


const getModels = async (req, res) => {
    try {
        const models = await Model.find();
        const modelsWithUsers = await Promise.all(models.map(async model => {
            const user = await User.findById(model.createdBy);
            return {
                ...model.toObject(),
                creatorEmail: user.email,
                creatorName: user.name
            };
        }));
        res.status(200).json(modelsWithUsers);
    } catch(error) {
        console.error("Can't retrieve models from DB:", error);
        res.status(500).json({msg: "error retrieving data"});
    }
}

const classifyImage = async (req, res) => {
  const file = req.file;
  console.log("Inside classify image, file is:", file);
  console.log("Model ID:", req.body.modelId);

  let cloudModelName = "";
  let modelPath = "";
  let imageUrl = "";
  let classesLength=0
  let model=null
  let modelArch=""

  try {
    
     model = await Model.findById(req.body.modelId, "modelNameOnCloud path classes modelArcheticture");
    cloudModelName = model.modelNameOnCloud;
    modelPath = model.path;
    classesLength=model.classes.length
    modelArch=model.modelArcheticture
    console.log("classes length in node.js : ",classesLength)

  } catch (err) {
    console.log("Error getting model from database", err);
    return res.status(500).json({ msg: "Error getting model from database", error: err.message });
  }



  try {
    
    const uploadStream = cloudinary.uploader.upload_stream({
      folder: `classify/${cloudModelName}`,
      public_id: `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`,
    }, (err, result) => {
      if (err) {
        console.log("Error uploading to Cloudinary", err);
        return res.status(500).json({ message: 'Error uploading to Cloudinary', error: err });
      }

      console.log('File uploaded to Cloudinary:', result.secure_url);
      imageUrl = result.secure_url;  

      console.log(" the sent arch for python is :",modelArch)
      axios.post(`${python_api_url}/classify`, {
        image_url: imageUrl,
        model_path: modelPath,
        classes_length:classesLength,
        model_arch:modelArch
      })
        .then(response => {
          const result = response.data.predicted_class;
          const confidences = response.data.confidences;
          console.log("Classification result:", result);
          console.log("Confidences:", confidences);
          
          res.status(200).json({ 
            result: model.classes[result],
            confidences: confidences
          });
        })
        .catch(err => {
          if (err.response) {
            console.error("status:", err.response.status);
            console.error("body:", err.response.data);
          } else {
            console.error(err);
          }
          res.status(500).json({ msg: "Error classifying image.", error: err.response?.data });
        });
    });

    uploadStream.end(file.buffer);

  } catch (err) {
    console.log("Error saving input image", err);
    res.status(500).json({ msg: "Error saving input image.", error: err.message });
  }
};

const getModelClasses=async(req,res)=>{
const {id}=req.params

  try{
    const model=await Model.findById(id ,"classes name modelDescription createdBy")
    const user=await User.findById(model.createdBy,"name email")
    console.log("mode classes : ",model.classes)
    res.status(200).json({classes:model.classes,
      modelName:model.name,
      modelDescription:model.modelDescription,
      createdBy:model.createdBy, 
      authorName:user.name, 
      authorEmail:user.email})
      
  }
  catch(err){
    console.log("error retrieving classes from database : ",err)
    res.status(500).json({msg:"error happend while retrieving classes from database"})
  }
}

const getModelsByUser=async(req,res)=>{
  const {id}=req.params
  try{
    const user=await User.findById(id,"name")
    const models=await Model.find({createdBy:id})
    if(!models){
      return res.status(404).json({msg:"no models found"})
    }
  
    res.status(200).json({models:models,userName:user.name})
  }
  catch(err){
    console.log("error retrieving models from database : ",err)
    res.status(500).json({msg:"error happend while retrieving models from database"})
  }
}

const getModelDataset = async (req, res) => {
  const { id } = req.params;
  try {
    const model=await Model.findById(id,"modelNameOnCloud classes")
    const classes=model.classes
    const modelNameOnCloud=model.modelNameOnCloud
    const dataset = [];
    for (const className of classes) {
      const searchExpr = `public_id:"dataset/${modelNameOnCloud}/${className}/*"`;
      const result = await cloudinary.search
        .expression(searchExpr)
        .sort_by('public_id', 'desc')
        .max_results(500)
        .execute();
      const images = Array.isArray(result.resources) ? result.resources.map(r => r.secure_url) : [];
      
      dataset.push({
        className,
        images
      });
    }
    res.status(200).json(dataset);
  } catch (err) {
    console.log("error retrieving dataset from database : ", err);
    res.status(500).json({ msg: "error happend while retrieving dataset from database" });
  }
}



module.exports = {
  upload,
  handleTrainNewModel,
  getModels,
  classifyImage,
  getModelClasses,
  getModelsByUser,
  getModelDataset
};
