// summary.ts
// Modul untuk mencatat dan memformat ringkasan laporan hasil unduhan

export interface DownloadSummaryData {
    title: string;
    totalUrls: number;
    successCount: number;
    failedCount: number;
    startTime: Date;
    endTime?: Date;
}

export interface SummaryOptions {
    includeDetails?: boolean;
}

/**
 * Memformat data ringkasan menjadi teks laporan yang rapi di terminal.
 * @param summary Objek DownloadSummaryData yang berisi statistik unduhan
 * @param options Opsi kustomisasi tampilan
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

    return report.trim();
}

export default {
    formatSummaryReport,
};