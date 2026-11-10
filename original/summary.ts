// summary.ts
// Modul untuk mencatat dan memformat ringkasan laporan hasil unduhan serta menyimpan log kegagalan

import * as fs from 'fs';
import * as path from 'path';

export interface DownloadSummaryData {
    title: string;
    totalUrls: number;
    successCount: number;
    failedCount: number;
    failedUrls?: string[]; // Properti baru untuk menampung daftar URL yang gagal
    startTime: Date;
    endTime?: Date;
}

export interface SummaryOptions {
    includeDetails?: boolean;
    logFilePath?: string; // Opsi untuk menentukan lokasi file log (default: log.txt)
}

/**
 * Memformat data ringkasan menjadi teks laporan yang rapi di terminal
 * dan mencatat daftar URL yang gagal ke file log.
 * @param summary Objek DownloadSummaryData yang berisi statistik unduhan
 * @param options Opsi kustomisasi tampilan dan log
 */
export function formatSummaryReport(
    summary: DownloadSummaryData,
    options: SummaryOptions = {}
): string {
    const endTime = summary.endTime || new Date();
    const durationMs = endTime.getTime() - summary.startTime.getTime();
    const durationSec = (durationMs / 1000).toFixed(1);

    const successRate =
        summary.totalUrls > 0
            ? ((summary.successCount / summary.totalUrls) * 100).toFixed(1)
            : '0.0';

    let report = `
========================================
         RINGKASAN LAPORAN UNDUHAN       
========================================
 Judul Proses : ${summary.title}
 Waktu Selesai: ${endTime.toLocaleString('id-ID')}
 Durasi       : ${durationSec} detik
----------------------------------------
 Total URL    : ${summary.totalUrls}
 Berhasil     : ${summary.successCount}
 Gagal        : ${summary.failedCount}
 Tingkat Sukses: ${successRate}%
========================================
`;

    if (options.includeDetails) {
        report += `\nStatus Akhir: ${summary.failedCount === 0 ? 'SEMUA BERHASIL' : 'ADA YANG GAGAL'
            }\n`;
    }

    // Catat URL gagal ke log.txt jika ada data failedUrls
    if (summary.failedUrls && summary.failedUrls.length > 0) {
        const logPath = options.logFilePath || path.join(process.cwd(), 'log.txt');
        writeFailedUrlsToLog(summary.title, summary.failedUrls, logPath);
        report += `\n[INFO] Daftar URL yang gagal telah dicatat di: ${logPath}\n`;
    }

    return report.trim();
}

/**
 * Fungsi internal untuk menulis daftar URL gagal ke file log.txt
 */
function writeFailedUrlsToLog(title: string, failedUrls: string[], filePath: string): void {
    const timestamp = new Date().toLocaleString('id-ID');
    let logContent = `\n=== LOG KEGAGALAN UNDUHAN [${timestamp}] - ${title} ===\n`;

    failedUrls.forEach((url, index) => {
        logContent += `${index + 1}. ${url}\n`;
    });

    logContent += `-------------------------------------------------------\n`;

    try {
        // Menggunakan appendFileSync agar log baru tidak menimpa riwayat log lama
        fs.appendFileSync(filePath, logContent, 'utf-8');
    } catch (error) {
        console.error(`Gagal menulis ke file log (${filePath}):`, error);
    }
}

export default {
    formatSummaryReport,
};