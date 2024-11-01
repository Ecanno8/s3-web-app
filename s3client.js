// s3client.js

const AWS = require('aws-sdk');
const express = require('express');
const bodyParser = require('body-parser');
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

// Endpoint to list all objects in the bucket
app.get('/list-objects', async (req, res) => {
    const params = {
        Bucket: 'cccf-s3-web-app-bucket' // Your bucket name
    };

    try {
        const data = await s3.listObjectsV2(params).promise();
        const objectKeys = data.Contents.map(item => item.Key);
        res.json(objectKeys); // Send back the list of object keys
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving objects');
    }
});

// Endpoint to upload an object to the bucket
app.post('/upload', (req, res) => {
    const { fileName, fileContent } = req.body; // Assume you're sending fileName and fileContent in the body

    const params = {
        Bucket: 'cccf-s3-web-app-bucket',
        Key: fileName,
        Body: fileContent,
        ContentType: 'text/plain' // Change as necessary (e.g., 'image/jpeg' for images)
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

// Endpoint to list and display image URLs
app.get('/images', async (req, res) => {
    const params = {
        Bucket: 'cccf-s3-web-app-bucket'
    };

    try {
        const data = await s3.listObjectsV2(params).promise();
        const imageUrls = data.Contents.map(item => {
            return `https://${params.Bucket}.s3.amazonaws.com/${item.Key}`;
        });
        res.json(imageUrls); // Send image URLs to the frontend
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving images');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
