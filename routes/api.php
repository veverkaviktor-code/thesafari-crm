<?php

use App\Http\Controllers\Api\TicketApiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware(['auth:sanctum', 'throttle:20,1'])->group(function () {
    Route::post('/tickets', [TicketApiController::class, 'store']);
});
