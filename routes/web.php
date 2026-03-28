<?php

use App\Http\Controllers\AresController;
use App\Http\Controllers\EstimateController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\ResetPasswordController;
use App\Http\Controllers\CompanySettingsController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmailAccountController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\ManagementPlanController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SyncBlacklistController;
use App\Http\Controllers\SupportController;
use App\Http\Controllers\LogsController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\VpsServerController;
use App\Http\Controllers\DomainController;
use App\Http\Controllers\HostingController;
use App\Http\Controllers\HostingCredentialController;
use App\Http\Controllers\OrderCostController;
use App\Http\Controllers\OrderItemController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TimeEntryController;
use Illuminate\Support\Facades\Route;

Route::get('/login', [LoginController::class, 'show'])->name('login');
Route::post('/login', [LoginController::class, 'store'])->middleware('throttle:5,1');
Route::post('/logout', [LoginController::class, 'destroy'])->name('logout');

Route::get('/zapomenute-heslo', [ForgotPasswordController::class, 'show'])->name('password.request');
Route::post('/zapomenute-heslo', [ForgotPasswordController::class, 'store'])->name('password.email')->middleware('throttle:5,1');
Route::get('/obnovit-heslo/{token}', [ResetPasswordController::class, 'show'])->name('password.reset');
Route::post('/obnovit-heslo', [ResetPasswordController::class, 'store'])->name('password.update');

Route::get('/podpora', [SupportController::class, 'show'])->name('podpora');
Route::post('/podpora', [SupportController::class, 'store'])->middleware('throttle:10,1');

Route::redirect('/dashboard', '/');

Route::middleware('auth')->group(function () {
    Route::get('/', DashboardController::class)->name('dashboard');

    // Zákazníci bulk — MUSÍ být PŘED resource
    Route::post('zakaznici/bulk-delete', [CustomerController::class, 'bulkDelete'])->name('zakaznici.bulkDelete');
    Route::post('zakaznici/bulk-restore', [CustomerController::class, 'bulkRestore'])->name('zakaznici.bulkRestore');
    Route::delete('zakaznici/bulk-force-delete', [CustomerController::class, 'bulkForceDelete'])->name('zakaznici.bulkForceDelete');
    Route::delete('zakaznici/empty-trash', [CustomerController::class, 'emptyTrash'])->name('zakaznici.emptyTrash');
    Route::resource('zakaznici', CustomerController::class);
    Route::get('zakaznici/{zakaznici}/upravit', [CustomerController::class, 'edit']);
    Route::post('zakaznici/{id}/restore', [CustomerController::class, 'restore'])->name('zakaznici.restore');
    Route::delete('zakaznici/{id}/force-delete', [CustomerController::class, 'forceDelete'])->name('zakaznici.forceDelete');

    // Zakázky bulk — MUSÍ být PŘED resource
    Route::post('zakazky/bulk-delete', [OrderController::class, 'bulkDelete'])->name('zakazky.bulkDelete');
    Route::post('zakazky/bulk-restore', [OrderController::class, 'bulkRestore'])->name('zakazky.bulkRestore');
    Route::delete('zakazky/bulk-force-delete', [OrderController::class, 'bulkForceDelete'])->name('zakazky.bulkForceDelete');
    Route::delete('zakazky/empty-trash', [OrderController::class, 'emptyTrash'])->name('zakazky.emptyTrash');
    Route::resource('zakazky', OrderController::class);
    Route::get('zakazky/{zakazky}/upravit', [OrderController::class, 'edit']);
    Route::post('zakazky/{id}/restore', [OrderController::class, 'restore'])->name('zakazky.restore');
    Route::delete('zakazky/{id}/force-delete', [OrderController::class, 'forceDelete'])->name('zakazky.forceDelete');

    Route::post('zakazky/{order}/time-entries', [TimeEntryController::class, 'store'])->name('time-entries.store');
    Route::put('zakazky/{order}/time-entries/{timeEntry}', [TimeEntryController::class, 'update'])->name('time-entries.update');
    Route::put('zakazky/{order}/time-entries/{timeEntry}/pause', [TimeEntryController::class, 'pause'])->name('time-entries.pause');
    Route::put('zakazky/{order}/time-entries/{timeEntry}/resume', [TimeEntryController::class, 'resume'])->name('time-entries.resume');
    Route::put('zakazky/{order}/time-entries/{timeEntry}/stop', [TimeEntryController::class, 'stop'])->name('time-entries.stop');
    Route::delete('zakazky/{order}/time-entries/{timeEntry}', [TimeEntryController::class, 'destroy'])->name('time-entries.destroy');

    Route::post('zakazky/{order}/naklady', [OrderCostController::class, 'store'])->name('order-costs.store');
    Route::put('zakazky/{order}/naklady/{orderCost}', [OrderCostController::class, 'update'])->name('order-costs.update');
    Route::delete('zakazky/{order}/naklady/{orderCost}', [OrderCostController::class, 'destroy'])->name('order-costs.destroy');

    Route::post('zakazky/{order}/polozky', [OrderItemController::class, 'store'])->name('order-items.store');
    Route::put('zakazky/{order}/polozky/{orderItem}', [OrderItemController::class, 'update'])->name('order-items.update');
    Route::delete('zakazky/{order}/polozky/{orderItem}', [OrderItemController::class, 'destroy'])->name('order-items.destroy');

    Route::get('faktury/export', [InvoiceController::class, 'exportCsv'])->name('faktury.export');
    Route::post('faktury/sync-bank', [InvoiceController::class, 'syncFromBank'])->name('invoices.syncBank');
    // Faktury bulk — MUSÍ být PŘED resource
    Route::post('faktury/bulk-delete', [InvoiceController::class, 'bulkDelete'])->name('faktury.bulkDelete');
    Route::post('faktury/bulk-restore', [InvoiceController::class, 'bulkRestore'])->name('faktury.bulkRestore');
    Route::delete('faktury/bulk-force-delete', [InvoiceController::class, 'bulkForceDelete'])->name('faktury.bulkForceDelete');
    Route::delete('faktury/empty-trash', [InvoiceController::class, 'emptyTrash'])->name('faktury.emptyTrash');
    Route::resource('faktury', InvoiceController::class);
    Route::get('faktury/{faktury}/upravit', [InvoiceController::class, 'edit']);
    Route::get('faktury/{invoice}/pdf', [InvoiceController::class, 'downloadPdf'])->name('faktury.pdf');
    Route::post('faktury/{invoice}/send', [InvoiceController::class, 'sendEmail'])->name('faktury.send');
    Route::post('faktury/{invoice}/paid', [InvoiceController::class, 'markAsPaid'])->name('faktury.paid');
    Route::post('faktury/{id}/restore', [InvoiceController::class, 'restore'])->name('faktury.restore');
    Route::delete('faktury/{id}/force-delete', [InvoiceController::class, 'forceDelete'])->name('faktury.forceDelete');
    Route::post('faktury/{faktury}/match-bank', [InvoiceController::class, 'matchBankTransaction'])->name('invoices.matchBank');

    Route::get('finance', [FinanceController::class, 'index'])->name('finance');

    // Legacy pozadavky routes removed — use /zpravy instead (redirect below)

    // ===== DOMÉNY =====
    // Static routes BEFORE resource (so {domain} parameter doesn't capture literals)
    Route::post('/domeny/sync-vashosting', [DomainController::class, 'syncVasHosting'])->name('domains.sync-vashosting');
    Route::post('/domeny/sync-wedos', [DomainController::class, 'syncWedos'])->name('domains.sync-wedos');
    Route::post('/domeny/bulk-update', [DomainController::class, 'bulkUpdate'])->name('domains.bulk-update');
    Route::get('/domeny/vytvorit', [DomainController::class, 'create'])->name('domains.create');
    Route::get('/domeny/ke-schvaleni', [DomainController::class, 'pending'])->name('domains.pending');
    Route::post('/domeny/ke-schvaleni/approve', [DomainController::class, 'approvePending'])->name('domains.pending.approve');
    Route::post('/domeny/ke-schvaleni/ignore', [DomainController::class, 'ignorePending'])->name('domains.pending.ignore');
    Route::post('/domeny/{domain}/faktura', [DomainController::class, 'createInvoice'])->name('domains.invoice.create');
    Route::resource('domeny', DomainController::class)->parameters(['domeny' => 'domain'])->except(['create']);

    // ===== HOSTINGY =====
    Route::post('/hostingy/sync-sss06', [HostingController::class, 'syncSss06'])->name('hostings.sync-sss06');
    Route::post('/hostingy/sync-ond08', [HostingController::class, 'syncOnd08'])->name('hostings.sync-ond08');
    Route::post('/hostingy/sync-thaimassage', [HostingController::class, 'syncThaimassage'])->name('hostings.sync-thaimassage');
    Route::post('/hostingy/bulk-update', [HostingController::class, 'bulkUpdate'])->name('hostings.bulk-update');
    Route::post('/hostingy/activate-domain', [HostingController::class, 'activateDomain'])->name('hostings.activate-domain');
    Route::get('/hostingy/vytvorit', [HostingController::class, 'create'])->name('hostings.create');
    Route::post('/hostingy/faktura-zakaznik/{customer}', [HostingController::class, 'createCustomerInvoice'])->name('hostings.invoice.createCustomer');
    Route::get('/hostingy/ke-schvaleni', [HostingController::class, 'pending'])->name('hostings.pending');
    Route::post('/hostingy/ke-schvaleni/approve', [HostingController::class, 'approvePending'])->name('hostings.pending.approve');
    Route::post('/hostingy/ke-schvaleni/ignore', [HostingController::class, 'ignorePending'])->name('hostings.pending.ignore');
    Route::post('/hostingy/{hosting}/faktura', [HostingController::class, 'createInvoice'])->name('hostings.invoice.create');
    Route::post('/hostingy/{hosting}/toggle-ignore', [HostingController::class, 'toggleIgnoreAlerts'])->name('hostings.toggleIgnore');
    Route::post('/hostingy/{hosting}/sync', [HostingController::class, 'syncSingle'])->name('hostings.sync-single');
    Route::post('/hostingy/{hosting}/credentials', [HostingCredentialController::class, 'store'])->name('credentials.store');
    Route::put('/hostingy/credentials/{credential}', [HostingCredentialController::class, 'update'])->name('credentials.update');
    Route::delete('/hostingy/credentials/{credential}', [HostingCredentialController::class, 'destroy'])->name('credentials.destroy');
    Route::post('/hostingy/{hosting}/emaily', [EmailAccountController::class, 'store'])->name('email-accounts.store');
    Route::resource('hostingy', HostingController::class)->parameters(['hostingy' => 'hosting'])->except(['create']);

    // ===== VPS =====
    Route::get('/vps', [VpsServerController::class, 'index'])->name('vps.index');
    Route::post('/vps', [VpsServerController::class, 'store'])->name('vps.store');
    Route::put('/vps/{vps}', [VpsServerController::class, 'update'])->name('vps.update');
    Route::delete('/vps/{vps}', [VpsServerController::class, 'destroy'])->name('vps.destroy');
    Route::post('/vps/sync', [VpsServerController::class, 'syncFromHostings'])->name('vps.sync');

    // Email účty (mimo hosting kontext)
    Route::put('emaily/{emailAccount}', [EmailAccountController::class, 'update'])->name('email-accounts.update');
    Route::delete('emaily/{emailAccount}', [EmailAccountController::class, 'destroy'])->name('email-accounts.destroy');

    // Planner (úkoly) — bulk PŘED resource
    Route::post('planovac/bulk-delete', [TaskController::class, 'bulkDelete'])->name('planovac.bulkDelete');
    Route::post('planovac/bulk-restore', [TaskController::class, 'bulkRestore'])->name('planovac.bulkRestore');
    Route::delete('planovac/bulk-force-delete', [TaskController::class, 'bulkForceDelete'])->name('planovac.bulkForceDelete');
    Route::delete('planovac/empty-trash', [TaskController::class, 'emptyTrash'])->name('planovac.emptyTrash');
    Route::resource('planovac', TaskController::class)->except(['show', 'create', 'edit']);
    Route::post('planovac/{task}/toggle', [TaskController::class, 'toggleComplete'])->name('planovac.toggle');
    Route::post('planovac/{id}/restore', [TaskController::class, 'restore'])->name('planovac.restore');
    Route::delete('planovac/{id}/force-delete', [TaskController::class, 'forceDelete'])->name('planovac.forceDelete');

    // Notifications
    Route::get('notifikace', [NotificationController::class, 'index'])->name('notifikace.index');
    Route::post('notifikace/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifikace.read');
    Route::post('notifikace/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifikace.readAll');

    // Attachments
    Route::post('attachments', [AttachmentController::class, 'store'])->name('attachments.store');
    Route::get('attachments/{attachment}/download', [AttachmentController::class, 'download'])->name('attachments.download');
    Route::get('attachments/{attachment}/preview', [AttachmentController::class, 'preview'])->name('attachments.preview');
    Route::delete('attachments/{attachment}', [AttachmentController::class, 'destroy'])->name('attachments.destroy');

    // Settings
    Route::get("nastaveni", [SettingsController::class, "index"])->name("settings.index");
    Route::prefix("nastaveni")->group(function () {
        Route::get('profil', [ProfileController::class, 'edit'])->name('settings.profile');
        Route::put('profil', [ProfileController::class, 'update'])->name('settings.profile.update');
        Route::put('profil/heslo', [ProfileController::class, 'updatePassword'])->name('settings.password.update');
        Route::get('firma', [CompanySettingsController::class, 'edit'])->name('settings.company');
        Route::put('firma', [CompanySettingsController::class, 'update'])->name('settings.company.update');
        Route::post('hesla', [\App\Http\Controllers\VaultController::class, 'store'])->name('settings.vault.store');
        Route::put('hesla/{vault}', [\App\Http\Controllers\VaultController::class, 'update'])->name('settings.vault.update');
        Route::delete('hesla/{vault}', [\App\Http\Controllers\VaultController::class, 'destroy'])->name('settings.vault.destroy');
        Route::post('balicky', [ManagementPlanController::class, 'store'])->name('management-plans.store');
        Route::put('balicky/{plan}', [ManagementPlanController::class, 'update'])->name('management-plans.update');
        Route::delete('balicky/{plan}', [ManagementPlanController::class, 'destroy'])->name('management-plans.destroy');
        Route::delete('blacklist/{blacklist}', [SyncBlacklistController::class, 'destroy'])->name('sync-blacklist.destroy');
    });

    // Kalkulator (Estimates) — bulk PŘED resource
    Route::post('kalkulator/bulk-delete', [EstimateController::class, 'bulkDelete'])->name('kalkulator.bulkDelete');
    Route::post('kalkulator/bulk-restore', [EstimateController::class, 'bulkRestore'])->name('kalkulator.bulkRestore');
    Route::delete('kalkulator/bulk-force-delete', [EstimateController::class, 'bulkForceDelete'])->name('kalkulator.bulkForceDelete');
    Route::delete('kalkulator/empty-trash', [EstimateController::class, 'emptyTrash'])->name('kalkulator.emptyTrash');
    Route::resource('kalkulator', EstimateController::class);
    Route::post('kalkulator/{id}/restore', [EstimateController::class, 'restore'])->name('kalkulator.restore');
    Route::delete('kalkulator/{id}/force-delete', [EstimateController::class, 'forceDelete'])->name('kalkulator.forceDelete');
    Route::post('kalkulator/{kalkulator}/items', [EstimateController::class, 'storeItem'])->name('kalkulator.items.store');
    Route::put('kalkulator/{kalkulator}/items/{item}', [EstimateController::class, 'updateItem'])->name('kalkulator.items.update');
    Route::delete('kalkulator/{kalkulator}/items/{item}', [EstimateController::class, 'destroyItem'])->name('kalkulator.items.destroy');
    Route::post('kalkulator/{kalkulator}/photos', [EstimateController::class, 'storePhoto'])->name('kalkulator.photos.store');
    Route::delete('kalkulator/{kalkulator}/photos/{photo}', [EstimateController::class, 'destroyPhoto'])->name('kalkulator.photos.destroy');

    // Logy
    Route::get('logy', [LogsController::class, 'index'])->name('logy.index');

    // Zprávy (redirect from old URL) — bulk PŘED resource
    Route::redirect('/pozadavky', '/zpravy', 301);
    Route::post('zpravy/bulk-delete', [TicketController::class, 'bulkDelete'])->name('zpravy.bulkDelete');
    Route::post('zpravy/bulk-restore', [TicketController::class, 'bulkRestore'])->name('zpravy.bulkRestore');
    Route::delete('zpravy/bulk-force-delete', [TicketController::class, 'bulkForceDelete'])->name('zpravy.bulkForceDelete');
    Route::delete('zpravy/empty-trash', [TicketController::class, 'emptyTrash'])->name('zpravy.emptyTrash');
    Route::resource('zpravy', TicketController::class);
    Route::post('zpravy/{ticket}/reply', [TicketController::class, 'reply'])->name('zpravy.reply');
    Route::post('zpravy/{id}/restore', [TicketController::class, 'restore'])->name('zpravy.restore');
    Route::delete('zpravy/{id}/force-delete', [TicketController::class, 'forceDelete'])->name('zpravy.forceDelete');

    // Global search
    Route::get('search', SearchController::class)->name('search');

    // ARES lookup
    Route::get('api/ares/{ico}', [AresController::class, 'lookup'])->name('ares.lookup');
});

// Legacy redirects (outside auth middleware — catch-all)
Route::get('/webove-sluzby/{any?}', fn($any = '') => redirect('/hostingy/' . $any, 301))->where('any', '.*');
Route::get('/neniweb/{any?}', fn($any = '') => redirect('/hostingy/' . $any, 301))->where('any', '.*');
