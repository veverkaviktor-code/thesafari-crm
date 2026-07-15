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
        $schedule->command('hostings:auto-invoice')->dailyAt('09:00');
        $schedule->command('domains:auto-invoice')->dailyAt('09:05');
        $schedule->command('fio:sync')->everyThirtyMinutes();
        $schedule->command('invoices:check-overdue')->dailyAt('08:00');
        $schedule->command('hostings:check-expiring')->dailyAt('08:00');
        $schedule->command('domains:check-expiring')->dailyAt('08:05');
        $schedule->command('notifications:generate')->dailyAt('08:55');
        $schedule->command('invoices:send-pre-reminders')->dailyAt('09:10');
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
