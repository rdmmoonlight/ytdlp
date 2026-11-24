import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from './setting';
import { formatSummaryReport } from './summary';
import { targetUrls } from './url';

const ffmpegPath = ffmpegInstaller.path;

if (!fs.existsSync(CONFIG.outputFolder)) {
  fs.mkdirSync(CONFIG.outputFolder, { recursive: true });
}

function downloadAac(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(
      CONFIG.outputFolder,
      '%(album,uploader,channel|Unknown Source)s',
      CONFIG.outputTemplate
    );

    const args = [
      '--ffmpeg-location',
      ffmpegPath,
      '-x',
      '--audio-format',
      CONFIG.audioFormat,
      '--audio-quality',
      CONFIG.audioQuality,
      '--no-post-overwrites', // Lewati jika file akhir (.m4a) sudah ada, tapi timpa file mentah (.webm) yang gagal dikonversi
      '--no-continue', // Unduh ulang dari 0% jika terputus agar file tidak korup
      '--no-part', // Hindari penumpukan file .part sisa unduhan terhenti
      '-o',
      outputPath,
      url,
    ];

    console.log(`[START] Memproses URL: ${url}`);

    const child = spawn(CONFIG.ytDlpBinary, args);

    child.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('has already been downloaded')) {
        console.log(`[SKIP] File sudah ada untuk URL: ${url}`);
      }
      process.stdout.write(output);
    });

    child.stderr.on('data', (data: Buffer) => {
      process.stderr.write(data.toString());
    });

    child.on('close', (code: number | null) => {
      if (code === 0) {
        console.log(`[SELESAI] Sukses/Dilewati: ${url}`);
        resolve();
      } else {
        console.error(`[ERROR] Gagal: ${url} (Code: ${code})`);
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });

    child.on('error', (err: Error) => {
      console.error(`[ERROR] Sistem error:`, err.message);
      reject(err);
    });
  });
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  if (targetUrls.length === 0) {
    console.log('Tidak ada URL di file url.ts');
    return;
  }

  const startTime = new Date();
  let successCount = 0;
  let failedCount = 0;
  const failedUrls: string[] = [];

  const urlBatches = chunkArray(targetUrls, CONFIG.maxConcurrentDownloads);

  console.log(`Total URL: ${targetUrls.length}`);
  console.log(
    `Mode Sesi: Maksimal ${CONFIG.maxConcurrentDownloads} unduhan paralel per sesi (${urlBatches.length} sesi)\n`
  );

  for (let i = 0; i < urlBatches.length; i++) {
    const batch = urlBatches[i];
    console.log(`\n========================================`);
    console.log(`>>> MENJALANKAN SESI ${i + 1} / ${urlBatches.length} (${batch.length} URL) <<<`);
    console.log(`========================================\n`);

    const results = await Promise.allSettled(batch.map((url) => downloadAac(url)));

    results.forEach((res, index) => {
      if (res.status === 'fulfilled') {
        successCount++;
      } else {
        failedCount++;
        failedUrls.push(batch[index]);
      }
    });

    if (i < urlBatches.length - 1 && CONFIG.delayBetweenBatchesMs > 0) {
      console.log(`\nWaiting ${CONFIG.delayBetweenBatchesMs}ms sebelum sesi berikutnya...`);
      await delay(CONFIG.delayBetweenBatchesMs);
    }
  }

  const summaryText = formatSummaryReport(
    {
      title: `Pengunduhan Audio ${CONFIG.audioFormat.toUpperCase()}`,
      totalUrls: targetUrls.length,
      successCount,
      failedCount,
      failedUrls,
      startTime,
      endTime: new Date(),
    },
    { includeDetails: true }
  );

  console.log('\n' + summaryText + '\n');
}

run();
