<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\TimeEntryController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/login', [LoginController::class, 'show'])->name('login');
Route::post('/login', [LoginController::class, 'store']);
Route::post('/logout', [LoginController::class, 'destroy'])->name('logout');

Route::middleware('auth')->group(function () {
    Route::get('/', fn () => Inertia::render('Dashboard'));
    Route::resource('zakaznici', CustomerController::class);
    Route::resource('zakazky', OrderController::class);

    Route::post('zakazky/{order}/time/start', [TimeEntryController::class, 'start'])->name('time.start');
    Route::post('time/{timeEntry}/stop', [TimeEntryController::class, 'stop'])->name('time.stop');
    Route::delete('time/{timeEntry}', [TimeEntryController::class, 'destroy'])->name('time.destroy');
});
