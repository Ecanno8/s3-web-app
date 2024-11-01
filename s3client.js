// s3client.js

const AWS = require('aws-sdk');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const app = express();
const port = process.env.PORT || 3000;

// Configure AWS SDK
AWS.config.update({
    region: 'your-region', // e.g., 'us-west-2'
    // Note: Credentials are managed through the instance profile
});

// Create S3 service object
const s3 = new AWS.S3();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files from the 'public' directory

// Set up multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(), // Store files in memory for upload
});

// Endpoint to list all objects in the bucket
app.get('/list-objects', async (req, res) => {
    const params = {
        Bucket: 'cccf-s3-web-app-bucket' // Your bucket name
    };

    try {
        const data = await s3.listObjectsV2(params).promise();
        res.json(data.Contents); // Send back the list of objects
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving objects');
    }
});

// Endpoint to upload an image to the bucket
app.post('/images', upload.single('image'), (req, res) => {
    const fileContent = req.file.buffer; // Get file content from multer
    const fileName = req.file.originalname; // Get the original file name

    const params = {
        Bucket: 'cccf-s3-web-app-bucket',
        Key: `images/${fileName}`, // Store images in an 'images' folder
        Body: fileContent,
        ContentType: req.file.mimetype, // Set content type from uploaded file
    };

    s3.upload(params, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error uploading file');
        }
        res.json({ message: 'File uploaded successfully', data });
    });
});

// Endpoint to retrieve an object from the bucket
app.get('/retrieve/:key', (req, res) => {
    const params = {
        Bucket: 'cccf-s3-web-app-bucket',
        Key: req.params.key
    };

    s3.getObject(params, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error retrieving file');
        }
        res.send(data.Body); // Send the file content back (use appropriate content type)
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
