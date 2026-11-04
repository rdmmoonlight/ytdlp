import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from './setting';
import { formatSummaryReport } from './summary';

/** Penerima log (terminal, web, dst). */
export type Log = (text: string) => void;

/**
 * Tentukan path FFmpeg:
 * Gunakan FFmpeg sistem jika tersedia di Linux/Docker,
 * fallback ke @ffmpeg-installer/ffmpeg jika di lokal.
 */
function getFfmpegPath(): string {
  if (process.env.FFMPEG_PATH) {
    return process.env.FFMPEG_PATH;
  }
  // Jika di Linux/Docker Alpine, pakai 'ffmpeg' dari system PATH
  if (process.platform === 'linux') {
    return 'ffmpeg';
  }
  return ffmpegInstaller.path;
}

const ffmpegPath = getFfmpegPath();
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function downloadAac(url: string, index: number, log: Log): Promise<void> {
  return new Promise((resolve, reject) => {
    // Path output yang aman baik untuk playlist maupun video tunggal
    const outputPath = path.join(
      CONFIG.outputFolder,
      '%(playlist_title,playlist|Single_Videos)s',
      CONFIG.outputTemplate
    );

    const args = [
      '--ffmpeg-location', ffmpegPath,
      '-x',
      '--audio-format', CONFIG.audioFormat,
      '--audio-quality', CONFIG.audioQuality,
      '--no-overwrites',
      '--yes-playlist',
      '--newline', // Memudahkan pencatatan progress per baris
      '-o', outputPath,
      url,
    ];

    log(`[START] Memproses URL/Playlist ${index + 1}: ${url}\n`);

    // Gunakan biner dari config atau fallback ke 'yt-dlp' global
    const binary = CONFIG.ytDlpBinary || 'yt-dlp';
    const child = spawn(binary, args);
    let spawnFailed = false;

    child.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('has already been downloaded')) {
        log(`[SKIP] File sudah ada untuk URL: ${url}\n`);
      }
      log(output);
    });

    child.stderr.on('data', (data: Buffer) => log(`[STDERR] ${data.toString()}`));

    child.on('close', (code: number) => {
      if (spawnFailed) return;
      if (code === 0) {
        log(`[SELESAI] Process ${index + 1}: ${url}\n`);
        resolve();
      } else {
        log(`[ERROR] Gagal pada URL ${index + 1}: ${url} (Exit Code: ${code})\n`);
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });

    child.on('error', (err: Error) => {
      spawnFailed = true;
      log(`[ERROR] Gagal menjalankan process yt-dlp: ${err.message}\n`);
      reject(err);
    });
  });
}

/** Unduh semua URL per sesi, kembalikan teks ringkasan. Dipakai oleh web dan CLI. */
export async function runDownloads(urls: string[], log: Log): Promise<string> {
  // Pastikan direktori output utama ada
  if (!fs.existsSync(CONFIG.outputFolder)) {
    fs.mkdirSync(CONFIG.outputFolder, { recursive: true });
  }

  const startTime = new Date();
  let successCount = 0;
  let failedCount = 0;

  const indexed = urls.map((url, index) => ({ url, index }));
  const batches = chunkArray(indexed, CONFIG.maxConcurrentDownloads);

  log(`Total URL/Playlist: ${urls.length}\n`);
  log(`Mode Sesi: maksimal ${CONFIG.maxConcurrentDownloads} unduhan paralel per sesi (${batches.length} sesi)\n`);

  for (let i = 0; i < batches.length; i++) {
    log(`\n>>> SESI ${i + 1} / ${batches.length} (${batches[i].length} Item) <<<\n\n`);

    const results = await Promise.allSettled(
      batches[i].map((item) => downloadAac(item.url, item.index, log))
    );

    results.forEach((r) => (r.status === 'fulfilled' ? successCount++ : failedCount++));

    if (i < batches.length - 1 && CONFIG.delayBetweenBatchesMs > 0) {
      log(`\nMenunggu ${CONFIG.delayBetweenBatchesMs}ms sebelum sesi berikutnya...\n`);
      await delay(CONFIG.delayBetweenBatchesMs);
    }
  }

  return formatSummaryReport(
    {
      title: `Pengunduhan Audio ${CONFIG.audioFormat.toUpperCase()}`,
      totalUrls: urls.length,
      successCount,
      failedCount,
      startTime,
      endTime: new Date(),
    },
    { includeDetails: true }
  );
}