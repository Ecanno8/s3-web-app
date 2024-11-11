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
app.get('/original-images', async (req, res) => {
    const params = {
        Bucket: 'cccflambucket',
        Prefix: 'original-images/', // Adjust if necessary
    };

    try {
        const data = await s3Client.send(new ListObjectsV2Command(params));
        if (data.Contents) {
            res.json(data.Contents.map(obj => obj.Key)); // Return image paths
        } else {
            res.json([]); // Return empty array if no images
        }
    } catch (error) {
        console.error("Error listing objects from S3:", error);
        res.status(500).json({ error: "Error fetching images from S3." }); // Ensure JSON format
    }
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Endpoint to upload a file to the S3 'images/' folder
app.post('/original-images', async (req, res) => {
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
                Bucket: 'cccflambucket',
                Key: `original-images/${file.name}`, // Ensure the path matches your S3 folder
                Body: fileStream,
            };
            await s3Client.send(new PutObjectCommand(uploadParams));

            res.send(`File uploaded successfully to ${uploadParams.Bucket}/original-images/${file.name}`);
            const fetchParams = {
                Bucket: 'cccflambucket',
                Prefix: 'resized-images/', // Adjust if necessary 
            }
            // delay 3 seconds - waiting for lambda to run
            await sleep(3000);
            try {
                const data = await s3Client.send(new ListObjectsV2Command(params));
            }
            catch (error) {
                console.error("Error listing resized images:", error);
                res.status(500).json({ error: "Error listing resized images from S3." }); // Ensure JSON format
            }

            if (data === null) {
                res.send({ "original_file": `$file.name`, "resized_file": "UNKNOWN" })
            }
            const resizedfilename = data.Contents.map(obj => obj.Key).find(key => key.includes(file.name));
            res.send({ "original_file": `$file.name`, "resized_file": resizedfilename })
            // ==================================
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
