document.addEventListener('DOMContentLoaded', function() {
    const urlInput = document.getElementById('urlInput');
    const fetchBtn = document.getElementById('fetchBtn');
    const formatSection = document.getElementById('formatSection');
    const videoInfo = document.getElementById('videoInfo');
    const downloadBtn = document.getElementById('downloadBtn');
    const progressSection = document.getElementById('progressSection');
    const progressStatus = document.getElementById('progressStatus');
    const progressPercent = document.getElementById('progressPercent');
    const progressFill = document.getElementById('progressFill');
    const formatBtns = document.querySelectorAll('.format-btn');

    let selectedFormat = 'best';
    let currentVideoInfo = null;

    // Format button selection
    formatBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            formatBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedFormat = this.dataset.format;
        });
    });

    // Fetch video info
    fetchBtn.addEventListener('click', fetchVideoInfo);
    urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') fetchVideoInfo();
    });

    async function fetchVideoInfo() {
        const url = urlInput.value.trim();
        if (!url) {
            showError('Please enter a valid URL');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/formats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (data.error) {
                showError(data.error);
                return;
            }

            currentVideoInfo = data;
            displayVideoInfo(data);
        } catch (error) {
            showError('Failed to fetch video info. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    function displayVideoInfo(data) {
        videoInfo.innerHTML = `
            <img src="${data.thumbnail}" alt="Thumbnail" class="video-thumbnail">
            <div class="video-details">
                <h3>${escapeHtml(data.title)}</h3>
                <p>${data.formats.length} quality options available</p>
            </div>
        `;
        formatSection.style.display = 'block';
    }

    // Download video
    downloadBtn.addEventListener('click', startDownload);

    async function startDownload() {
        const url = urlInput.value.trim();
        if (!url) return;

        downloadBtn.disabled = true;
        downloadBtn.innerHTML = `
            <span class="loading-spinner" style="display: block;"></span>
            Starting...
        `;

        try {
            const response = await fetch('/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, format: selectedFormat })
            });

            const data = await response.json();

            if (data.error) {
                showError(data.error);
                resetDownloadButton();
                return;
            }

            // Show progress
            formatSection.style.display = 'none';
            progressSection.style.display = 'block';
            progressStatus.textContent = 'Preparing download...';
            progressPercent.textContent = '0%';
            progressFill.style.width = '0%';

            // Poll for progress
            pollProgress(data.download_id);

        } catch (error) {
            showError('Failed to start download');
            resetDownloadButton();
        }
    }

    async function pollProgress(downloadId) {
        let attempts = 0;
        const maxAttempts = 300; // 5 minutes max

        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/progress/${downloadId}`);
                const data = await response.json();

                if (data.status === 'error') {
                    clearInterval(interval);
                    showError(data.error || 'Download failed');
                    resetDownloadButton();
                    progressSection.style.display = 'none';
                    formatSection.style.display = 'block';
                    return;
                }

                if (data.status === 'completed' && data.filename) {
                    clearInterval(interval);
                    progressStatus.textContent = 'Download complete!';
                    progressPercent.textContent = '100%';
                    progressFill.style.width = '100%';

                    // Trigger download
                    window.location.href = `/download/file/${encodeURIComponent(data.filename)}`;

                    setTimeout(() => {
                        resetDownloadButton();
                        progressSection.style.display = 'none';
                        formatSection.style.display = 'block';
                    }, 2000);
                    return;
                }

                if (data.status === 'downloading') {
                    progressStatus.textContent = 'Downloading...';
                    progressPercent.textContent = data.progress || '0%';
                    progressFill.style.width = data.progress?.replace('%', '') || '0%';
                }

                attempts++;
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    showError('Download timed out');
                    resetDownloadButton();
                }

            } catch (error) {
                console.error('Progress check failed:', error);
            }
        }, 1000);
    }

    function resetDownloadButton() {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 16L16 11H13V4H11V11H8L12 16Z"/>
                <path d="M20 18H4C3.45 18 3 17.55 3 17C3 16.45 3.45 16 4 16H20C20.55 16 21 16.45 21 17C21 17.55 20.55 18 20 18Z"/>
            </svg>
            Download Video
        `;
    }

    function setLoading(isLoading) {
        fetchBtn.disabled = isLoading;
        fetchBtn.classList.toggle('loading', isLoading);
        urlInput.disabled = isLoading;
    }

    function showError(message) {
        alert(message);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
