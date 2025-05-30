require('dotenv').config();
const cloudinary = require('cloudinary').v2;


cloudinary.config({
  cloud_name: process.env.CloudName,
  api_key: process.env.ApiKey,
  api_secret:process.env.ApiSecret,
});

module.exports = cloudinary;