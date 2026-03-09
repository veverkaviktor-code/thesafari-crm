<?php

namespace App\Http\Controllers;

use App\Models\EmailLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LogsController extends Controller
{
    public function index(Request $request)
    {
        // Email logs
        $emailLogs = EmailLog::with(['invoice:id,invoice_number', 'customer:id,name,company'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        // Activity logs (cron, system) - from spatie/activitylog
        $activityLogs = \Spatie\Activitylog\Models\Activity::orderByDesc('created_at')
            ->where('created_at', '>=', now()->subDays(7))
            ->limit(100)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'description' => $log->description,
                    'subject_type' => $log->subject_type ? class_basename($log->subject_type) : null,
                    'subject_id' => $log->subject_id,
                    'causer_type' => $log->causer_type ? class_basename($log->causer_type) : 'System',
                    'properties' => $log->properties,
                    'created_at' => $log->created_at->toISOString(),
                ];
            });

        // Laravel error logs - parse last 50 errors from log file
        $errorLogs = $this->parseErrorLogs();

        return Inertia::render('Logs/Index', [
            'emailLogs' => $emailLogs,
            'activityLogs' => $activityLogs,
            'errorLogs' => $errorLogs,
        ]);
    }

    private function parseErrorLogs(): array
    {
        $logFile = storage_path('logs/laravel.log');
        if (!file_exists($logFile)) return [];

        $content = file_get_contents($logFile);
        // Match ERROR entries
        preg_match_all('/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] production\.ERROR: (.+?)(?=\n\[|\Z)/s', $content, $matches, PREG_SET_ORDER);

        $errors = [];
        foreach (array_slice(array_reverse($matches), 0, 50) as $match) {
            $message = trim($match[2]);
            // Truncate long messages
            if (strlen($message) > 500) {
                $message = substr($message, 0, 500) . '...';
            }
            $errors[] = [
                'timestamp' => $match[1],
                'message' => $message,
            ];
        }

        return $errors;
    }
}
