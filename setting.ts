import path from 'path';

export interface DownloaderConfig {
    /** Folder tujuan penyimpanan file yang diunduh */
    outputFolder: string;
    /** Template nama file yt-dlp (contoh: '%(title)s.%(ext)s') */
    outputTemplate: string;
    /** Format audio yang diekstrak (contoh: 'aac', 'mp3', 'm4a') */
    audioFormat: string;
    /** Kualitas/bitrate audio (contoh: '128k', '192k', '320k') */
    audioQuality: string;
    /** Nama executable yt-dlp */
    ytDlpBinary: string;
}

export const CONFIG: DownloaderConfig = {
    outputFolder: path.join(__dirname, 'download'),
    outputTemplate: '%(title)s.%(ext)s',
    audioFormat: 'aac',
    audioQuality: '128k',
    ytDlpBinary: 'yt-dlp',
};
