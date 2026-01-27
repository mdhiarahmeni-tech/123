from flask import Flask, render_template, request, jsonify, send_file, after_this_request
import yt_dlp
import os
import uuid
import threading
from functools import partial

app = Flask(__name__)

# Configuration
DOWNLOAD_FOLDER = 'downloads'
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

# Store download progress
download_progress = {}

def download_video_with_progress(url, download_id, options):
    """Download video with progress tracking"""
    download_progress[download_id] = {
        'status': 'downloading',
        'progress': 0,
        'filename': None,
        'error': None
    }
    
    def progress_hook(d):
        if d['status'] == 'downloading':
            try:
                percent = d.get('_percent_str', '0%')
                download_progress[download_id]['progress'] = percent
            except:
                pass
    
    options['progress_hooks'] = [progress_hook]
    
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            download_progress[download_id]['filename'] = filename
            download_progress[download_id]['status'] = 'completed'
            download_progress[download_id]['progress'] = '100%'
    except Exception as e:
        download_progress[download_id]['status'] = 'error'
        download_progress[download_id]['error'] = str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/download', methods=['POST'])
def download():
    data = request.get_json()
    url = data.get('url')
    format_type = data.get('format', 'best')
    
    if not url:
        return jsonify({'error': 'Please provide a URL'}), 400
    
    download_id = str(uuid.uuid4())
    
    # Configure yt-dlp options
    ydl_opts = {
        'outtmpl': os.path.join(DOWNLOAD_FOLDER, '%(title)s_%(id)s.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
    }
    
    if format_type == 'audio':
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
    else:
        ydl_opts['format'] = 'best'
    
    # Start download in background thread
    thread = threading.Thread(
        target=download_video_with_progress,
        args=(url, download_id, ydl_opts)
    )
    thread.start()
    
    return jsonify({'download_id': download_id})

@app.route('/progress/<download_id>')
def get_progress(download_id):
    if download_id in download_progress:
        return jsonify(download_progress[download_id])
    return jsonify({'status': 'not_found'})

@app.route('/download/file/<filename>')
def download_file(filename):
    """Download the file after cleaning up"""
    filepath = os.path.join(DOWNLOAD_FOLDER, filename)
    
    @after_this_request
    def remove_file(response):
        try:
            # Remove file after sending
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception:
            pass
        return response
    
    return send_file(filepath, as_attachment=True)

@app.route('/formats', methods=['POST'])
def get_formats():
    """Get available formats for a URL"""
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'Please provide a URL'}), 400
    
    ydl_opts = {
        'quiet': True,
        'listformats': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            formats = []
            for f in info.get('formats', []):
                if f.get('ext') and f.get('format_note'):
                    formats.append({
                        'format_id': f.get('format_id'),
                        'ext': f.get('ext'),
                        'resolution': f.get('resolution', f.get('format_note')),
                        'filesize': f.get('filesize'),
                    })
            return jsonify({
                'title': info.get('title'),
                'thumbnail': info.get('thumbnail'),
                'formats': formats[:20]  # Limit to top 20
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
