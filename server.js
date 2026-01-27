const express = require('express');
const ytdl = require('ytdl-core');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Download folder
const downloadsDir = path.join(__dirname, 'downloads');
const fs = require('fs');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Get video info
app.post('/api/info', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    
    try {
        const info = await ytdl.getInfo(url);
        const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
        
        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails?.[0]?.url || '',
            author: info.videoDetails.author.name,
            lengthSeconds: info.videoDetails.lengthSeconds,
            formats: formats.map(f => ({
                itag: f.itag,
                quality: f.qualityLabel || f.quality,
                container: f.container,
                contentLength: f.contentLength
            })).slice(0, 10)
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Download video
app.get('/api/download', async (req, res) => {
    const { url, itag } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    
    try {
        const info = await ytdl.getInfo(url);
        const format = itag ? ytdl.chooseFormat(info.formats, { itag: parseInt(itag) }) : ytdl.chooseFormat(info.formats, { quality: 'highest' });
        
        if (!format) {
            return res.status(400).json({ error: 'Format not available' });
        }
        
        const filename = `${info.videoDetails.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.${format.container}`;
        const filepath = path.join(downloadsDir, filename);
        
        // Download to file first
        const fileStream = fs.createWriteStream(filepath);
        await new Promise((resolve, reject) => {
            ytdl(url, { format })
                .pipe(fileStream)
                .on('finish', resolve)
                .on('error', reject);
        });
        
        // Send file and cleanup
        res.download(filepath, filename, () => {
            try {
                fs.unlinkSync(filepath);
            } catch (e) {}
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Audio only download
app.get('/api/audio', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    
    try {
        const info = await ytdl.getInfo(url);
        const filename = `${info.videoDetails.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.mp3`;
        const filepath = path.join(downloadsDir, filename);
        
        const fileStream = fs.createWriteStream(filepath);
        await new Promise((resolve, reject) => {
            ytdl(url, { quality: 'highestaudio' })
                .pipe(ytdl.filterFormat(info.formats, 'audioonly')[0])
                .pipe(fileStream)
                .on('finish', resolve)
                .on('error', reject);
        });
        
        res.download(filepath, filename, () => {
            try {
                fs.unlinkSync(filepath);
            } catch (e) {}
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
