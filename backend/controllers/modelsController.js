const multer = require('multer');
const cloudinary = require('../cloudinaryConfig'); 

const axios = require('axios');
const uuid = require('uuid'); 
const Model=require("../models/models");
const User=require("../models/users");
const python_api_url="http://127.0.0.1:5000"
const storage = multer.memoryStorage();
const mongoose = require('mongoose');

const upload = multer({ storage });


function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timeout')), ms))
  ]);
}



const uploadToCloudinary = (file, modelFolder) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({
      folder: modelFolder,
      public_id: `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`,
    }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        
        resolve(result);
      }
    }).end(file.buffer);
  });
};

const handleTrainNewModel = async (req, res) => {
  const { default: pLimit } = await import('p-limit');
const limit = pLimit(19);
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded.' });
  }

  const classesCount = parseInt(req.body.classesCount, 10);
  let classNames = [];
  const modelArch = req.body.modelArch;
  const modelCategory = req.body.category;
  const uniqueModelId = uuid.v4().slice(0, 8);
  const modelNameWithUniqueId = `${req.body.modelName}_${uniqueModelId}`;

  // Collect all upload promises and track the first image
  let uploadPromises = [];
  let firstClassFirstImage = null;
  let firstClassFound = false;
  let skippedFiles = [];
  let successfulUploads = [];

  for (let i = 0; i < classesCount; i++) {
    console.log(req.body[`class_name_${i}`])
    const className = req.body[`class_name_${i}`];
    if (!className) {
      return res.status(400).json({ message: `Missing class name for class_${i}` });
    }
    classNames.push(className);

    const classFiles = req.files.filter(file => file.fieldname === `class_dataset_${i}`);
    if (classFiles && classFiles.length > 0) {
      classFiles.forEach((file, fileIndex) => {
        // wrap the upload call in p-limit
        const job = limit(() =>
          withTimeout(uploadToCloudinary(file, `dataset/${modelNameWithUniqueId}/${className}`), 30 * 60 * 1000)
            .then(result => {
              if (!firstClassFound && fileIndex === 0) {
                firstClassFirstImage = result.secure_url;
                firstClassFound = true;
              }
              successfulUploads.push({
                className,
                fileName: file.originalname,
                url: result.secure_url
              });
              return result;
            })
            .catch(err => {
              console.warn(`Skipping invalid image: ${file.originalname} (${err.message})`);
              skippedFiles.push({
                className,
                fileName: file.originalname,
                error: err.message
              });
              return null;
            })
        );
        uploadPromises.push(job);
      });
    } else {
      console.log(`No files for class_${i}`);
    }
  }

  try {
    // Wait for all uploads to finish (success or fail)
    await Promise.allSettled(uploadPromises);

    // Optionally, you can filter out classes with no valid images here
    // Now proceed with training
    console.log("Trying to train with model name:", modelNameWithUniqueId);
    const response = await axios.post(`${python_api_url}/train`, {
      modelName: modelNameWithUniqueId,
      classes: classNames,
      modelArch,
    } ,
    {
      timeout: 0,               // disable timeout
      maxContentLength: Infinity,
      maxBodyLength: Infinity,  // if you’re sending/receiving large payloads
    });
    const modelPath = response.data.modelPath;
    const cloudPath = response.data.cloudPath;
    

    console.log('Training Response:', response.data);
    console.log("Model path:", modelPath);
    console.log("Cloud path:", cloudPath);
    console.log("Feature image URL:", firstClassFirstImage);

    try {
      console.log("User ID:", req.userId);
      const newModel = new Model({
        name: req.body.modelName,
        modelNameOnCloud: modelNameWithUniqueId,
        modelDescription: req.body.modelDescription,
        path: "./models/" + modelPath,
        cloudPath: cloudPath,
        classes: classNames,
        modelArcheticture: modelArch,
        modelCategory: modelCategory,
        createdBy: req.userId,
        featureImage: firstClassFirstImage  // Save the Cloudinary URL directly
      });
      const savedModel = await newModel.save();
      res.json({
        message: 'Model trained successfully!',
        modelName: modelNameWithUniqueId,
        classNames: classNames,
        modelPath: modelPath,
        cloudPath: cloudPath,
        modelId: savedModel._id,
        featureImage: firstClassFirstImage,
        skippedFiles // Optionally report skipped files
      });
    } catch (error) {
      console.log("Error saving model document:", error);
      res.status(500).json({ message: 'Error saving model document', error: error.message });
    }
  } catch (error) {
    console.error('Error in training process:', error);
    if (error.response) {
      console.error('Python server response:', error.response.data);
      return res.status(error.response.status).json({
        message: 'Error from Python server',
        error: error.response.data
      });
    }
    return res.status(500).json({
      message: 'Error in training process',
      error: error.message
    });
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
  let localPath = "";
  let cloudPath = "";
  let imageUrl = "";
  let classesLength = 0;
  let model = null;
  let modelArch = "";

  try {
    model = await Model.findById(req.body.modelId, "modelNameOnCloud path cloudPath classes modelArcheticture");
    cloudModelName = model.modelNameOnCloud;
    localPath = model.path;
    cloudPath = model.cloudPath;
    classesLength = model.classes.length;
    modelArch = model.modelArcheticture;
    console.log("Classes length in node.js:", classesLength);
    console.log("Local path:", localPath);
    console.log("Cloud path:", cloudPath);
  } catch (err) {
    console.log("Error getting model from database", err);
    return res.status(500).json({ msg: "Error getting model from database", error: err.message });
  }

  try {
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
        folder: `classify/${cloudModelName}`,
        public_id: `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`,
      }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
      uploadStream.end(file.buffer);
    });

    console.log('File uploaded to Cloudinary:', uploadResult.secure_url);
    imageUrl = uploadResult.secure_url;

    console.log("Sending classification request to Python server...");
    const response = await axios.post(`${python_api_url}/classify`, {
      image_url: imageUrl,
      local_path: localPath,
      cloud_path: cloudPath,
      classes_length: classesLength,
      model_arch: modelArch
    });

    const result = response.data.predicted_class;
    const confidences = response.data.confidences;
    console.log("Classification result:", result);
    console.log("Confidences:", confidences);
    const isOther = response.data.is_other;
    console.log("Is other:", isOther);

    if(!isOther){
      res.status(200).json({
        result: model.classes[result],
        confidences: confidences,
        isOther
      });
    }
    else{
      res.status(200).json({
        result: "Other / uncertain",
        confidences: confidences,
        isOther
      });
      }
  } catch (err) {
    console.error("Error in classification:", err);
    if (err.response) {
      console.error("Python server response:", err.response.data);
      return res.status(err.response.status).json({
        msg: "Error classifying image",
        error: err.response.data
      });
    }
    res.status(500).json({
      msg: "Error in classification process",
      error: err.message
    });
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

const getModelsByUser = async (req, res) => {
  const userId = req.params.id;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ models: [], error: 'Invalid user ID format.' });
  }

  try {
    const user = await User.findById(userId);
    console.log("user : ",user)
    if (!user) {
      return res.status(400).json({ models: [], error: 'User not found.' });
    }
    const models = await Model.find({ createdBy: userId });
    if (!models || models.length === 0) {
      return res.status(200).json({ models: [], error: "No models found for this user." });
    }
    res.status(200).json({ models: models, userName: user.name });
  } catch (err) {
    console.log("error retrieving models from database : ", err);
    res.status(500).json({ models: [], error: "Error happened while retrieving models from database" });
  }
}

const getModelDataset = async (req, res) => {
  const { id } = req.params;
  try {
    const model=await Model.findById(id,"name modelNameOnCloud classes")
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
    res.status(200).json({dataset:dataset,modelName:model.name});
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
