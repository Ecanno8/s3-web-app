// Import necessary modules
const express = require('express');
const fileUpload = require('express-fileupload');
const { S3Client, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp'); // Ensure the uploads directory exists
require('dotenv').config(); // Load environment variables

const app = express();
app.use(fileUpload());
const PORT = process.env.PORT || 3000;

// Create S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    forcePathStyle: true,
});

// Serve the HTML file
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/index.html'));
});

app.get('/styles.css', function (req, res) {
    res.sendFile(path.join(__dirname, '/styles.css'));
});

// List objects in S3 bucket
app.get('/images', async (req, res) => {
    const listObjectsParams = {
        Bucket: process.env.BUCKET_NAME,
    };

    try {
        const listObjectsCmd = new ListObjectsV2Command(listObjectsParams);
        const listObjectsResponse = await s3Client.send(listObjectsCmd);
        res.json(listObjectsResponse);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error listing objects");
    }
});

// Upload an object to S3 bucket
app.post('/images', async (req, res) => {
    if (!req.files || !req.files.image) {
        return res.status(400).send("No file uploaded.");
    }
    const file = req.files.image;

    // File type validation (optional)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).send("Invalid file type. Only JPEG, PNG, and GIF are allowed.");
    }
    const tempDir = path.join(__dirname, 'uploads');
    mkdirp.sync(tempDir); // Ensure the uploads directory exists
    const tempPath = path.join(tempDir, file.name);
    // Move the file to a temporary path
    file.mv(tempPath, async (err) => {
        if (err) {
            return res.status(500).send(err);
        }
        // Read the file from the temp path and upload it to S3
        try {
            const fileStream = fs.createReadStream(tempPath);
            const uploadParams = {
                Bucket: process.env.BUCKET_NAME,
                Key: file.name,
                Body: fileStream,
            };
            const putObjectCmd = new PutObjectCommand(uploadParams);
            await s3Client.send(putObjectCmd);
            res.send(`File uploaded successfully to ${process.env.BUCKET_NAME}/${file.name}`);
        } catch (err) {
            console.error(err);
            res.status(500).send("Error uploading file");
        } finally {
            fs.unlinkSync(tempPath); // Optionally, delete the temp file after uploading
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});