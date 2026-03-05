<?php

use App\Http\Controllers\AresController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\CompanySettingsController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\VpsServerController;
use App\Http\Controllers\OrderCostController;
use App\Http\Controllers\OrderItemController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TimeEntryController;
use Illuminate\Support\Facades\Route;

Route::get('/login', [LoginController::class, 'show'])->name('login');
Route::post('/login', [LoginController::class, 'store']);
Route::post('/logout', [LoginController::class, 'destroy'])->name('logout');

Route::redirect('/dashboard', '/');

Route::middleware('auth')->group(function () {
    Route::get('/', DashboardController::class)->name('dashboard');

    Route::resource('zakaznici', CustomerController::class);
    Route::get('zakaznici/{zakaznici}/upravit', [CustomerController::class, 'edit']);

    Route::resource('zakazky', OrderController::class);
    Route::get('zakazky/{zakazky}/upravit', [OrderController::class, 'edit']);

    Route::post('zakazky/{order}/time-entries', [TimeEntryController::class, 'store'])->name('time-entries.store');
    Route::put('zakazky/{order}/time-entries/{timeEntry}', [TimeEntryController::class, 'update'])->name('time-entries.update');
    Route::put('zakazky/{order}/time-entries/{timeEntry}/stop', [TimeEntryController::class, 'stop'])->name('time-entries.stop');
    Route::delete('zakazky/{order}/time-entries/{timeEntry}', [TimeEntryController::class, 'destroy'])->name('time-entries.destroy');

    Route::post('zakazky/{order}/naklady', [OrderCostController::class, 'store'])->name('order-costs.store');
    Route::put('zakazky/{order}/naklady/{orderCost}', [OrderCostController::class, 'update'])->name('order-costs.update');
    Route::delete('zakazky/{order}/naklady/{orderCost}', [OrderCostController::class, 'destroy'])->name('order-costs.destroy');

    Route::post('zakazky/{order}/polozky', [OrderItemController::class, 'store'])->name('order-items.store');
    Route::put('zakazky/{order}/polozky/{orderItem}', [OrderItemController::class, 'update'])->name('order-items.update');
    Route::delete('zakazky/{order}/polozky/{orderItem}', [OrderItemController::class, 'destroy'])->name('order-items.destroy');

    Route::get('faktury/export', [InvoiceController::class, 'exportCsv'])->name('faktury.export');
    Route::resource('faktury', InvoiceController::class);
    Route::get('faktury/{faktury}/upravit', [InvoiceController::class, 'edit']);
    Route::get('faktury/{invoice}/pdf', [InvoiceController::class, 'downloadPdf'])->name('faktury.pdf');
    Route::post('faktury/{invoice}/send', [InvoiceController::class, 'sendEmail'])->name('faktury.send');
    Route::post('faktury/{invoice}/paid', [InvoiceController::class, 'markAsPaid'])->name('faktury.paid');
    Route::post('faktury/{id}/restore', [InvoiceController::class, 'restore'])->name('faktury.restore');
    Route::delete('faktury/{id}/force-delete', [InvoiceController::class, 'forceDelete'])->name('faktury.forceDelete');

    Route::get('finance', [FinanceController::class, 'index'])->name('finance');

    Route::resource('pozadavky', TicketController::class);
    Route::post('pozadavky/{ticket}/reply', [TicketController::class, 'reply'])->name('pozadavky.reply');

    Route::resource('neniweb', SubscriptionController::class);
    Route::get('neniweb/{neniweb}/upravit', [SubscriptionController::class, 'edit']);
    Route::post('neniweb/sync', [SubscriptionController::class, 'sync'])->name('neniweb.sync');
    Route::post('neniweb/bulk-update', [SubscriptionController::class, 'bulkUpdate'])->name('neniweb.bulk-update');
    Route::post('neniweb/{neniweb}/platby', [SubscriptionController::class, 'storePayment'])->name('neniweb.payments.store');
    Route::put('neniweb/{neniweb}/platby/{payment}/zaplaceno', [SubscriptionController::class, 'markPaymentPaid'])->name('neniweb.payments.paid');

    // VPS servery — sync route musí být PŘED {vp} aby nebyl "sync" brán jako ID
    Route::post('neniweb/vps/sync', [VpsServerController::class, 'syncFromHostings'])->name('vps.sync');
    Route::post('neniweb/vps', [VpsServerController::class, 'store'])->name('vps.store');
    Route::put('neniweb/vps/{vp}', [VpsServerController::class, 'update'])->name('vps.update');
    Route::delete('neniweb/vps/{vp}', [VpsServerController::class, 'destroy'])->name('vps.destroy');

    // Planner (úkoly)
    Route::resource('planovac', TaskController::class)->except(['show', 'create', 'edit']);
    Route::post('planovac/{task}/toggle', [TaskController::class, 'toggleComplete'])->name('planovac.toggle');

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

    // ARES lookup
    Route::get('api/ares/{ico}', [AresController::class, 'lookup'])->name('ares.lookup');
});
