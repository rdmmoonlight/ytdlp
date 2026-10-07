import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { formatSummaryReport } from './summary';
import { targetUrls } from './url';

const ffmpegPath = ffmpegInstaller.path;

const outputFolder = path.join(__dirname, 'download');
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
}

/**
 * Mengunduh audio AAC 128kbps dengan log berjalan real-time
 */
function downloadAac(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const outputTemplate = path.join(outputFolder, '%(title)s.%(ext)s');

        const args = [
            '--ffmpeg-location', ffmpegPath,
            '-x',
            '--audio-format', 'aac',
            '--audio-quality', '128k',
            '-o', outputTemplate,
            url,
        ];

        console.log(`\n========================================`);
        console.log(`[START] Memproses URL: ${url}`);
        console.log(`[FFMPEG] Path: ${ffmpegPath}`);
        console.log(`========================================\n`);

        const child = spawn('yt-dlp', args);

        child.stdout.on('data', (data: Buffer) => {
            process.stdout.write(data.toString());
        });

        child.stderr.on('data', (data: Buffer) => {
            process.stderr.write(data.toString());
        });

        child.on('close', (code: number) => {
            if (code === 0) {
                console.log(`\n[SELESAI] Sukses mengunduh: ${url}`);
                resolve();
            } else {
                console.error(`\n[ERROR] Gagal mengunduh URL: ${url} (Exit Code: ${code})`);
                reject(new Error(`yt-dlp exited with code ${code}`));
            }
        });

        child.on('error', (err: Error) => {
            console.error(`[ERROR] Terjadi kesalahan sistem:`, err.message);
            reject(err);
        });
    });
}

async function run() {
    if (targetUrls.length === 0) {
        console.log('Tidak ada URL di file url.ts');
        return;
    }

    const startTime = new Date();
    let successCount = 0;
    let failedCount = 0;

    for (const url of targetUrls) {
        try {
            await downloadAac(url);
            successCount++;
        } catch (error) {
            failedCount++;
            console.error(`Lanjut ke URL berikutnya...`);
        }
    }

    // Tampilkan ringkasan di akhir proses
    const summaryText = formatSummaryReport(
        {
            title: 'Pengunduhan Audio AAC',
            totalUrls: targetUrls.length,
            successCount,
            failedCount,
            startTime,
            endTime: new Date(),
        },
        { includeDetails: true }
    );

    console.log('\n' + summaryText + '\n');
}

run();