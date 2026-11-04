namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Process\Process;

class YtDlpController extends Controller
{
/**
* Stream real-time progress download menggunakan SSE.
* Route: GET /api/download/progress?url=...
*/
public function streamDownloadProgress(Request $request): StreamedResponse
{
$url = $request->query('url');

if (!$url) {
return response()->stream(function () {
echo "event: error\ndata: " . json_encode(['message' => 'URL wajib diisi']) . "\n\n";
}, 400, ['Content-Type' => 'text/event-stream']);
}

$response = new StreamedResponse(function () use ($url) {
// Hilangkan limit waktu eksekusi skrip PHP
set_time_limit(0);

// Format template output progress agar mudah di-parse: [PROGRESS] percentage|speed|eta
$outputPath = storage_path('app/public/downloads/%(title)s.%(ext)s');
$command = [
'yt-dlp',
'--newline',
'--progress-template', '[PROGRESS] %(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s',
'-o', $outputPath,
$url
];

$process = new Process($command);
$process->setTimeout(600); // Timeout 10 menit

// Jalankan proses dan kirim SSE event setiap ada baris baru di stdout
$process->run(function ($type, $buffer) {
if (Process::ERR === $type) {
// Kirim log error jika ada
echo "event: log\ndata: " . json_encode(['text' => trim($buffer)]) . "\n\n";
} else {
$lines = explode("\n", $buffer);
foreach ($lines as $line) {
$line = trim($line);
if (empty($line)) continue;

if (str_starts_with($line, '[PROGRESS]')) {
// Extract data persentase, kecepatan, dan sisa waktu
$payload = str_replace('[PROGRESS] ', '', $line);
$parts = explode('|', $payload);

$data = [
'percent' => trim($parts[0] ?? '0%'),
'speed' => trim($parts[1] ?? '0B/s'),
'eta' => trim($parts[2] ?? '00:00'),
];

echo "event: progress\ndata: " . json_encode($data) . "\n\n";
} else {
echo "event: log\ndata: " . json_encode(['text' => $line]) . "\n\n";
}
}
}

// Flush buffer PHP agar data langsung terkirim ke client
if (ob_get_level() > 0) ob_flush();
flush();
});

// Kirim event selesai
if ($process->isSuccessful()) {
echo "event: completed\ndata: " . json_encode(['message' => 'Download selesai!']) . "\n\n";
} else {
echo "event: error\ndata: " . json_encode(['message' => 'Gagal mengunduh media.']) . "\n\n";
}

if (ob_get_level() > 0) ob_flush();
flush();
});

// Header wajib untuk SSE dan mencegah buffer di proxy/Nginx
$response->headers->set('Content-Type', 'text/event-stream');
$response->headers->set('Cache-Control', 'no-cache');
$response->headers->set('Connection', 'keep-alive');
$response->headers->set('X-Accel-Buffering', 'no'); // Menonaktifkan buffering Nginx

return $response;
}
}