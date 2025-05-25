const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: 'dtcvwgftn',
  api_key: '652763481373822',
  api_secret: 'q4qzHsxpY1iSYZ1LlXZLpycFkV8'
});

cloudinary.search
  .expression('public_id:"dataset/Chest X-ray _186c0d26/Normal/*"')
  .max_results(30)
  .execute()
  .then(result => {
    console.log(result.resources.map(r => r.public_id));
  })
  .catch(err => {
    console.error('Cloudinary error:', err);
  });
