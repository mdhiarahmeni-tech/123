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
const progressFill = document.getElementById('progressFill');
const progressPercent = document.getElementById('progressPercent');

let currentUrl = '';

// Event listeners
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
        
        thumbnail.src = data.thumbnail;
        videoTitle.textContent = data.title;
        videoAuthor.textContent = data.author;
        
        videoInfo.style.display = 'flex';
        qualitySection.style.display = 'block';
        progressSection.style.display = 'none';
        
    } catch (error) {
        alert('Failed to fetch video info');
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
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';
    
    try {
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: currentUrl, quality })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
            return;
        }
        
        // Poll for status
        pollStatus(data.download_id);
        
    } catch (error) {
        alert('Download failed: ' + error.message);
        setDownloading(false);
    }
}

// Poll download status
async function pollStatus(downloadId) {
    const interval = setInterval(async () => {
        try {
            const response = await fetch(`/api/status/${downloadId}`);
            const data = await response.json();
            
            if (data.status === 'error') {
                clearInterval(interval);
                alert('Download failed: ' + data.error);
                setDownloading(false);
                return;
            }
            
            if (data.status === 'completed' && data.filename) {
                clearInterval(interval);
                progressStatus.textContent = 'Download complete!';
                progressFill.style.width = '100%';
                progressPercent.textContent = '100%';
                
                // Trigger download
                window.location.href = `/download/${encodeURIComponent(data.filename)}`;
                
                setTimeout(() => {
                    progressSection.style.display = 'none';
                    setDownloading(false);
                }, 2000);
                return;
            }
            
            if (data.status === 'downloading') {
                progressStatus.textContent = 'Downloading...';
                const progress = data.progress || 0;
                progressFill.style.width = progress + '%';
                progressPercent.textContent = progress + '%';
            }
            
        } catch (error) {
            console.error('Status check failed:', error);
        }
    }, 1000);
}

// Helper functions
function setLoading(isLoading) {
    fetchBtn.disabled = isLoading;
    urlInput.disabled = isLoading;
}

function setDownloading(isDownloading) {
    downloadBtn.disabled = isDownloading;
    qualitySelect.disabled = isDownloading;
}
