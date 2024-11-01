const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configure AWS SDK
AWS.config.update({ region: process.env.AWS_REGION });
const s3 = new AWS.S3();

// Middleware for file uploads
const upload = multer({ dest: 'uploads/' });

// Endpoint to list all objects in the S3 bucket
app.get('/list', async (req, res) => {
    try {
        const data = await s3.listObjectsV2({ Bucket: process.env.BUCKET_NAME }).promise();
        res.json(data.Contents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to upload an object to the S3 bucket
app.post('/upload', upload.single('file'), async (req, res) => {
    const fileContent = fs.readFileSync(req.file.path);
    const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: req.file.originalname,
        Body: fileContent,
        ContentType: req.file.mimetype,
    };

    try {
        await s3.upload(params).promise();
        res.status(200).json({ message: 'File uploaded successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to retrieve an object from the S3 bucket
app.get('/retrieve/:filename', async (req, res) => {
    const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: req.params.filename,
    };

    try {
        const data = await s3.getObject(params).promise();
        res.writeHead(200, { 'Content-Type': data.ContentType });
        res.end(data.Body);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
