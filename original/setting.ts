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
    /** 
     * Jumlah maksimal URL yang diunduh secara bersamaan per sesi/batch.
     * Contoh: 1 = sekuensial (satu per satu), 3 = 3 download sekaligus secara paralel.
     */
    maxConcurrentDownloads: number;
    /** Delay/jeda antar sesi batch dalam milidetik (contoh: 1000 = 1 detik) */
    delayBetweenBatchesMs: number;
}

export const CONFIG: DownloaderConfig = {
    outputFolder: path.join(__dirname, 'download'),
    outputTemplate: '%(title)s.%(ext)s',
    audioFormat: 'aac',
    audioQuality: '128k',
    ytDlpBinary: 'yt-dlp',
    maxConcurrentDownloads: 300, // Ubah angka ini untuk mengatur berapa unduhan per sesi/paralel
    delayBetweenBatchesMs: 1000, // Jeda antar batch (ms)
};