namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Log;

class ProcessYtDlpDownload implements ShouldQueue
{
use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

/**
* Timeout job dalam detik (misal: 10 menit)
*/
public int $timeout = 600;

public function __construct(
public string $url,
public string $format = 'best'
) {}

public function handle(): void
{
$outputPath = storage_path('app/public/downloads/%(title)s.%(ext)s');

// Eksekusi perintah yt-dlp via Laravel Process API
$result = Process::timeout(600)->run([
'yt-dlp',
'-f', $this->format,
'-o', $outputPath,
$this->url,
]);

if ($result->successful()) {
Log::info("Download berhasil untuk URL: {$this->url}");
} else {
Log::error("Download gagal: " . $result->errorOutput());
}
}
}