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

// Endpoint to list objects in the S3 'images/' folder
app.get('/images', async (req, res) => {
    const params = {
        Bucket: 'cccf-s3-web-app-bucket',
        Prefix: 'images/', // Ensure this matches your S3 folder structure
    };

    try {
        const data = await s3Client.send(new ListObjectsV2Command(params));
        console.log("S3 data:", JSON.stringify(data, null, 2));
        if (data.Contents) {
            res.json(data.Contents.map(obj => obj.Key)); // Return the image paths
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error("Error listing objects from S3:", error);
        res.status(500).send("Error fetching images from S3.");
    }
});

// Endpoint to upload a file to the S3 'images/' folder
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
                Bucket: 'cccf-s3-web-app-bucket',
                Key: `images/${file.name}`, // Ensure the path matches your S3 folder
                Body: fileStream,
            };
            await s3Client.send(new PutObjectCommand(uploadParams));
            res.send(`File uploaded successfully to ${uploadParams.Bucket}/images/${file.name}`);
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
