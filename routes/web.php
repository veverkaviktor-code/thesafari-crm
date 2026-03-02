<?php

use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\CompanySettingsController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\TimeEntryController;
use Illuminate\Support\Facades\Route;

Route::get('/login', [LoginController::class, 'show'])->name('login');
Route::post('/login', [LoginController::class, 'store']);
Route::post('/logout', [LoginController::class, 'destroy'])->name('logout');

Route::redirect('/dashboard', '/');

Route::middleware('auth')->group(function () {
    Route::get('/', DashboardController::class)->name('dashboard');

    Route::resource('zakaznici', CustomerController::class);
    Route::resource('zakazky', OrderController::class);

    Route::post('zakazky/{order}/time/start', [TimeEntryController::class, 'start'])->name('time.start');
    Route::post('time/{timeEntry}/stop', [TimeEntryController::class, 'stop'])->name('time.stop');
    Route::delete('time/{timeEntry}', [TimeEntryController::class, 'destroy'])->name('time.destroy');

    Route::resource('faktury', InvoiceController::class);
    Route::get('faktury/{invoice}/pdf', [InvoiceController::class, 'downloadPdf'])->name('faktury.pdf');
    Route::post('faktury/{invoice}/send', [InvoiceController::class, 'sendEmail'])->name('faktury.send');
    Route::post('faktury/{invoice}/paid', [InvoiceController::class, 'markAsPaid'])->name('faktury.paid');

    Route::resource('pozadavky', TicketController::class);
    Route::post('pozadavky/{ticket}/reply', [TicketController::class, 'reply'])->name('pozadavky.reply');

    Route::resource('neniweb', SubscriptionController::class);

    // Notifications
    Route::get('notifikace', [NotificationController::class, 'index'])->name('notifikace.index');
    Route::post('notifikace/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifikace.read');
    Route::post('notifikace/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifikace.readAll');

    // Attachments
    Route::post('attachments', [AttachmentController::class, 'store'])->name('attachments.store');
    Route::get('attachments/{attachment}/download', [AttachmentController::class, 'download'])->name('attachments.download');
    Route::delete('attachments/{attachment}', [AttachmentController::class, 'destroy'])->name('attachments.destroy');

    // Settings
    Route::get("nastaveni", [SettingsController::class, "index"])->name("settings.index");
    Route::prefix("nastaveni")->group(function () {
        Route::get('profil', [ProfileController::class, 'edit'])->name('settings.profile');
        Route::put('profil', [ProfileController::class, 'update'])->name('settings.profile.update');
        Route::put('profil/heslo', [ProfileController::class, 'updatePassword'])->name('settings.password.update');
        Route::get('firma', [CompanySettingsController::class, 'edit'])->name('settings.company');
        Route::put('firma', [CompanySettingsController::class, 'update'])->name('settings.company.update');
    });

    // Global search
    Route::get('search', SearchController::class)->name('search');
});
