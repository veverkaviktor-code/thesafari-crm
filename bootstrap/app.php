<?php

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Spatie\Activitylog\Models\Activity;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('websites:auto-invoice')->dailyAt('07:00');
        $schedule->command('fio:sync')->hourly()->between('8:00', '20:00');
        $schedule->command('invoices:check-overdue')->dailyAt('08:00');
        $schedule->command('websites:check-expiring')->dailyAt('08:30');
        $schedule->command('notifications:generate')->dailyAt('09:00');
        $schedule->command('invoices:send-reminders')->dailyAt('09:30');
        $schedule->command('model:prune')->dailyAt('03:00');
        $schedule->call(fn () => Activity::where('created_at', '<', now()->subDays(30))->delete())->dailyAt('03:30');
    })
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
