import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from './setting';
import { formatSummaryReport } from './summary';

/** Penerima log (terminal, web, dst). */
export type Log = (text: string) => void;

const ffmpegPath = ffmpegInstaller.path;
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
    // Path: outputFolder / [Nama Playlist] / [Judul Video].aac
    const outputPath = path.join(
      CONFIG.outputFolder,
      '%(playlist_title,playlist)s',
      CONFIG.outputTemplate
    );

    const args = [
      '--ffmpeg-location', ffmpegPath,
      '-x',
      '--audio-format', CONFIG.audioFormat,
      '--audio-quality', CONFIG.audioQuality,
      '--no-overwrites',
      '--yes-playlist',
      '-o', outputPath,
      url,
    ];

    log(`[START] Memproses Playlist ${index + 1}: ${url}\n`);
    const child = spawn(CONFIG.ytDlpBinary, args);
    let spawnFailed = false;

    child.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('has already been downloaded')) {
        log(`[SKIP] File sudah ada untuk URL: ${url}\n`);
      }
      log(output);
    });

    child.stderr.on('data', (data: Buffer) => log(data.toString()));

    child.on('close', (code: number) => {
      if (spawnFailed) return; // sudah dilaporkan oleh handler 'error'
      if (code === 0) {
        log(`[SELESAI] Playlist ${index + 1}: ${url}\n`);
        resolve();
      } else {
        log(`[ERROR] Gagal pada Playlist ${index + 1}: ${url} (Code: ${code})\n`);
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });

    child.on('error', (err: Error) => {
      spawnFailed = true;
      log(`[ERROR] Sistem error: ${err.message}\n`);
      reject(err);
    });
  });
}

/** Unduh semua URL per sesi, kembalikan teks ringkasan. Dipakai oleh web dan CLI. */
export async function runDownloads(urls: string[], log: Log): Promise<string> {
  fs.mkdirSync(CONFIG.outputFolder, { recursive: true });

  const startTime = new Date();
  let successCount = 0;
  let failedCount = 0;

  const indexed = urls.map((url, index) => ({ url, index }));
  const batches = chunkArray(indexed, CONFIG.maxConcurrentDownloads);

  log(`Total Playlist: ${urls.length}\n`);
  log(`Mode Sesi: maksimal ${CONFIG.maxConcurrentDownloads} playlist paralel per sesi (${batches.length} sesi)\n`);

  for (let i = 0; i < batches.length; i++) {
    log(`\n>>> SESI ${i + 1} / ${batches.length} (${batches[i].length} Playlist) <<<\n\n`);

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
