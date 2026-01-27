from flask import Flask, render_template, request, jsonify, send_file
import yt_dlp
import os
import uuid
import threading

app = Flask(__name__)

# Configuration
DOWNLOAD_FOLDER = 'downloads'
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

# Store download progress
download_progress = {}

def download_video(url, download_id, quality):
    """Download video with progress tracking"""
    download_progress[download_id] = {
        'status': 'downloading',
        'progress': 0,
        'filename': None,
        'error': None
    }
    
    try:
        # Configure options based on quality
        ydl_opts = {
            'outtmpl': os.path.join(DOWNLOAD_FOLDER, '%(title)s.%(ext)s'),
            'quiet': True,
            'no_warnings': True,
        }
        
        if quality == 'audio':
            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]
        elif quality == 'high':
            ydl_opts['format'] = 'bestvideo[height<=1080]+bestaudio/best'
        elif quality == 'medium':
            ydl_opts['format'] = 'bestvideo[height<=720]+bestaudio/best'
        elif quality == 'low':
            ydl_opts['format'] = 'bestvideo[height<=480]+bestaudio/best'
        else:
            ydl_opts['format'] = 'best'
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            # Handle audio post-processing
            if quality == 'audio':
                filename = filename.rsplit('.', 1)[0] + '.mp3'
            
            download_progress[download_id]['filename'] = filename
            download_progress[download_id]['status'] = 'completed'
            download_progress[download_id]['progress'] = 100
            
    except Exception as e:
        download_progress[download_id]['status'] = 'error'
        download_progress[download_id]['error'] = str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/info', methods=['POST'])
def get_video_info():
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    try:
        ydl_opts = {'quiet': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            return jsonify({
                'title': info.get('title'),
                'thumbnail': info.get('thumbnail'),
                'author': info.get('uploader'),
                'duration': info.get('duration'),
                'formats': info.get('formats', [])[:15]
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/download', methods=['POST'])
def start_download():
    data = request.get_json()
    url = data.get('url')
    quality = data.get('quality', 'highest')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    download_id = str(uuid.uuid4())
    
    # Start download in background thread
    thread = threading.Thread(
        target=download_video,
        args=(url, download_id, quality)
    )
    thread.start()
    
    return jsonify({'download_id': download_id})

@app.route('/api/status/<download_id>')
def get_status(download_id):
    if download_id in download_progress:
        return jsonify(download_progress[download_id])
    return jsonify({'status': 'not_found'})

@app.route('/download/<filename>')
def download_file(filename):
    """Download the file after sending"""
    filepath = os.path.join(DOWNLOAD_FOLDER, filename)
    
    try:
        response = send_file(filepath, as_attachment=True)
        
        @response.call_on_close
        def cleanup():
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
            except Exception:
                pass
        
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
