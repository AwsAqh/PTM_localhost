const express = require('express');
const { upload, handleFileUpload ,getModels,classifyImage} = require('../controllers/modelsController');
const jwt = require("jsonwebtoken");
const router = express.Router();


router.post('/upload', upload.any(), (req, res, next) => {
    console.log("Verifying token...");

    let token;
    if (req.headers["authorization"]) {
        
        token = req.headers["authorization"].split(" ")[1];  
    } else if (req.headers["x-auth-token"]) {
        
        token = req.headers["x-auth-token"];
    }

    if (!token) {
        console.log("No token provided");
        return res.status(401).json({ msg: "Unauthorized, no token provided" });
    }

    try {
        
        const decoded = jwt.verify(token, "a secret key");  
        console.log("Decoded token:", decoded);  
        
        
        req.userId = decoded.userId;  
        
        
        const classesCount = parseInt(req.body.classesCount, 10);
        if (isNaN(classesCount)) {
            return res.status(400).json({ error: 'Invalid classesCount' });
        }

        const dynamicFields = [];
        for (let i = 0; i < classesCount; i++) {
            dynamicFields.push({ name: `class_name_${i}`, maxCount: 1 });
            dynamicFields.push({ name: `class_dataset_${i}`, maxCount: 10 });
        }

        
        next();
    } catch (err) {
        console.log("Error verifying token:", err);
        return res.status(401).json({ msg: "Failed to verify token" });
    }
}, handleFileUpload); 

router.get("/models",getModels)

router.post("/classify",upload.single("file"), classifyImage)
module.exports = router;
