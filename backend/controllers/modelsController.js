const multer = require('multer');
const cloudinary = require('../cloudinaryConfig'); 
const axios = require('axios');
const uuid = require('uuid'); 
const Model=require("../models/models");
const { models } = require('mongoose');

const storage = multer.memoryStorage();


const upload = multer({ storage });

const handleFileUpload = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded.' });
  }

  const classesCount = parseInt(req.body.classesCount, 10);
  let classNames = [];

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
        const modelFolder = `${modelNameWithUniqueId}/${className}`;
        
      
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
    
    
    const response = await axios.post('http://127.0.0.1:5000/train', {
      modelName: modelNameWithUniqueId,  
      classes: classNames,
      
    });
    const modelPath = response.data.modelPath;  
    
    console.log('Training Response:', response.data);
    
    console.log("Model path:", modelPath);
    try {
      console.log(" id id :" , req.userId)
      const newModel = new Model({
          name: req.body.modelName,
          modelNameOnCloud:modelNameWithUniqueId,
          path: "/pytorch/models/" + modelPath,
          classes:classNames,
          createdBy: req.userId
      });
      await newModel.save();
  } catch (error) {
      console.log("Error saving model document:", error);
  }
  
  
    res.json({
      message: 'Files uploaded and training started successfully!',
      modelName: modelNameWithUniqueId, 
      classNames: classNames,
      modelPath: modelPath, 
    });
  } catch (error) {
    console.error('Error triggering training:', error);
    res.status(500).json({ message: 'Error starting model training', error: error.message });
  }
};


const getModels=async(req,res)=>{

    try{
      
      
      const models=await Model.find();
      res.status(200).json(models)
    
    }catch(error){
      console.error("Can't retrieve models from DB:", error);
        res.status(500).json({msg:" error retrieving data "})

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

  try {
    
     model = await Model.findById(req.body.modelId, "modelNameOnCloud path classes");
    cloudModelName = model.modelNameOnCloud;
    modelPath = model.path;
    classesLength=model.classes.length
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

      
      axios.post("http://127.0.0.1:5000/classify", {
        image_url: imageUrl,
        model_path: modelPath,
        classes_length:classesLength
      })
        .then(response => {
          const result = response.data.predicted_class;
          console.log("Classification result:", result);
          
          
          res.status(200).json({ result:model.classes[result] });
        })
        .catch(err => {
          console.log("Error classifying image!", err);
          res.status(500).json({ msg: "Error classifying image.", error: err.message });
        });
    });

    uploadStream.end(file.buffer);

  } catch (err) {
    console.log("Error saving input image", err);
    res.status(500).json({ msg: "Error saving input image.", error: err.message });
  }
};


module.exports = {
  upload,
  handleFileUpload,
  getModels,
  classifyImage
};
