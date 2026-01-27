// DOM Elements
const urlInput = document.getElementById('urlInput');
const fetchBtn = document.getElementById('fetchBtn');
const videoInfo = document.getElementById('videoInfo');
const thumbnail = document.getElementById('thumbnail');
const videoTitle = document.getElementById('videoTitle');
const videoAuthor = document.getElementById('videoAuthor');
const qualitySection = document.getElementById('qualitySection');
const qualitySelect = document.getElementById('qualitySelect');
const downloadBtn = document.getElementById('downloadBtn');
const progressSection = document.getElementById('progressSection');
const progressStatus = document.getElementById('progressStatus');
const progressPercent = document.getElementById('progressPercent');
const progressFill = document.getElementById('progressFill');

// State
let currentUrl = '';

// Event Listeners
fetchBtn.addEventListener('click', fetchVideoInfo);
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchVideoInfo();
});
downloadBtn.addEventListener('click', downloadVideo);

// Fetch video info
async function fetchVideoInfo() {
    const url = urlInput.value.trim();
    
    if (!url) {
        alert('Please enter a video URL');
        return;
    }
    
    setLoading(true);
    currentUrl = url;
    
    try {
        const response = await fetch('/api/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
            return;
        }
        
        // Display video info
        thumbnail.src = data.thumbnail;
        videoTitle.textContent = data.title;
        videoAuthor.textContent = data.author;
        
        videoInfo.style.display = 'flex';
        qualitySection.style.display = 'block';
        progressSection.style.display = 'none';
        
    } catch (error) {
        alert('Failed to fetch video info. Please check the URL.');
    } finally {
        setLoading(false);
    }
}

// Download video
async function downloadVideo() {
    const quality = qualitySelect.value;
    setDownloading(true);
    progressSection.style.display = 'block';
    progressStatus.textContent = 'Preparing download...';
    progressPercent.textContent = '0%';
    progressFill.style.width = '0%';
    
    try {
        let downloadUrl;
        
        if (quality === 'audio') {
            downloadUrl = `/api/audio?url=${encodeURIComponent(currentUrl)}`;
        } else {
            downloadUrl = `/api/download?url=${encodeURIComponent(currentUrl)}&quality=${quality}`;
        }
        
        // Create hidden download link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = '';
        document.body.appendChild(link);
        
        progressStatus.textContent = 'Downloading...';
        
        // Start download
        link.click();
        document.body.removeChild(link);
        
        // Simulate progress (actual progress requires stream monitoring)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5;
            if (progress >= 90) {
                clearInterval(progressInterval);
            }
            progressPercent.textContent = progress + '%';
            progressFill.style.width = progress + '%';
        }, 300);
        
        // Reset after download
        setTimeout(() => {
            progressStatus.textContent = 'Download complete!';
            progressPercent.textContent = '100%';
            progressFill.style.width = '100%';
            
            setTimeout(() => {
                progressSection.style.display = 'none';
                setDownloading(false);
            }, 2000);
        }, 3000);
        
    } catch (error) {
        alert('Download failed: ' + error.message);
        progressSection.style.display = 'none';
        setDownloading(false);
    }
}

// Helper functions
function setLoading(isLoading) {
    fetchBtn.disabled = isLoading;
    fetchBtn.classList.toggle('loading', isLoading);
    urlInput.disabled = isLoading;
}

function setDownloading(isDownloading) {
    downloadBtn.disabled = isDownloading;
    qualitySelect.disabled = isDownloading;
}
