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
        Bucket: 'cccf-s3-web-app',
        Prefix: 's3-web-app/images/' // Adjusted to match your folder structure
    };

    try {
        const command = new ListObjectsV2Command(params);
        const data = await s3Client.send(command);
        console.log("S3 data:", JSON.stringify(data, null, 2)); // Log the data in a readable format
        res.json(data);
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
                Bucket: 'cccf-s3-web-app', // Directly use your bucket name
                Key: `s3-web-app/images/${file.name}`, // Save in 's3-web-app/images/' folder
                Body: fileStream,
            };
            const putObjectCmd = new PutObjectCommand(uploadParams);
            await s3Client.send(putObjectCmd);
            res.send(`File uploaded successfully to ${uploadParams.Bucket}/s3-web-app/images/${file.name}`);
        } catch (err) {
            console.error("Error uploading file:", err);
            res.status(500).send("Error uploading file");
        } finally {
            fs.unlinkSync(tempPath); // Clean up the temporary file
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
