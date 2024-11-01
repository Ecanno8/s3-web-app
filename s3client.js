// Import necessary modules
const express = require('express');
const fileUpload = require('express-fileupload');
const { S3Client, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
require('dotenv').config();

const app = express();
app.use(fileUpload());
const PORT = process.env.PORT || 3000;

// S3 client setup
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
});

// Serve static files
app.use(express.static(__dirname));

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the CSS file
app.get('/styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'styles.css'));
});

// Endpoint to list objects in the S3 'Images/' folder
app.get('/images', async (req, res) => {
    const listObjectsParams = {
        Bucket: process.env.BUCKET_NAME,
        Prefix: 'images/' // Specify folder prefix
    };

    try {
        const listObjectsCmd = new ListObjectsV2Command(listObjectsParams);
        const listObjectsResponse = await s3Client.send(listObjectsCmd);
        res.json(listObjectsResponse);
    } catch (err) {
        console.error("Error listing objects:", err);
        res.status(500).send("Error listing objects");
    }
});

// Endpoint to upload a file to the S3 'Images/' folder
app.post('/images', async (req, res) => {
    if (!req.files || !req.files.image) {
        return res.status(400).send("No file uploaded.");
    }

    const file = req.files.image;
    const tempDir = path.join(__dirname, 'uploads');
    mkdirp.sync(tempDir);
    const tempPath = path.join(tempDir, file.name);

    file.mv(tempPath, async (err) => {
        if (err) return res.status(500).send(err);

        try {
            const fileStream = fs.createReadStream(tempPath);
            const uploadParams = {
                Bucket: process.env.BUCKET_NAME,
                Key: `images/${file.name}`, // Save in 'Images/' folder
                Body: fileStream,
            };
            const putObjectCmd = new PutObjectCommand(uploadParams);
            await s3Client.send(putObjectCmd);
            res.send(`File uploaded successfully to ${process.env.BUCKET_NAME}/images/${file.name}`);
        } catch (err) {
            console.error("Error uploading file:", err);
            res.status(500).send("Error uploading file");
        } finally {
            fs.unlinkSync(tempPath);
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
