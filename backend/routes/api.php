use Illuminate\Support\Facades\Route;
use App\Http\Controllers\YtDlpController;

Route::get('/events', [YtDlpController::class, 'getEvents']);
Route::get('/urls', [YtDlpController::class, 'getInfo']);
Route::post('/download', [YtDlpController::class, 'download']);
Route::get('/download/progress', [YtDlpController::class, 'streamDownloadProgress']);