// Import necessary modules
const express = require('express');
const fileUpload = require('express-fileupload');
const { S3Client, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load environment variables

const app = express();
app.use(fileUpload());
const PORT = process.env.PORT || 3000;

// Create S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: 'http://localhost:4566',
    forcePathStyle: true,
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
    const file = req.files.image;
    const fileName = file.name;
    const tempPath = path.join(process.env.UPLOAD_TEMP_PATH, fileName);

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
                Key: fileName,
                Body: fileStream,
            };

            const putObjectCmd = new PutObjectCommand(uploadParams);
            await s3Client.send(putObjectCmd);
            res.send(`File uploaded successfully to ${process.env.BUCKET_NAME}/${fileName}`);
        } catch (err) {
            console.error(err);
            res.status(500).send("Error uploading file");
        } finally {
            // Optionally, delete the temp file after uploading
            fs.unlinkSync(tempPath);
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
