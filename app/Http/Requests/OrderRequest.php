<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isUpdate = $this->isMethod('PUT') || $this->isMethod('PATCH');

        return [
            'customer_id' => [$isUpdate ? 'sometimes' : 'required', 'exists:customers,id'],
            'division' => [$isUpdate ? 'sometimes' : 'required', Rule::in(['tisk', 'reklama', 'polepy', 'montaze', 'weby'])],
            'status' => ['sometimes', Rule::in(['nova', 'v_reseni', 'hotovo', 'fakturovano'])],
            'title' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'deadline' => ['nullable', 'date'],
        ];
    }
}
