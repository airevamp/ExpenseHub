import { Component, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ReceiptService } from '../../services/receipt.service';
import { Receipt, EXPENSE_CATEGORIES, ReceiptUpdateRequest } from '../../../../core/models';

@Component({
  selector: 'app-receipt-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './receipt-edit.component.html',
  styleUrl: './receipt-edit.component.scss'
})
export class ReceiptEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly receiptService = inject(ReceiptService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  readonly receipt = signal<Receipt | null>(null);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly categories = EXPENSE_CATEGORIES;

  form!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.loadReceipt();
  }

  private initForm(): void {
    this.form = this.fb.group({
      merchantName: ['', Validators.required],
      transactionDate: [''],
      totalAmount: [null, [Validators.min(0)]],
      currency: ['USD', Validators.required],
      category: [''],
      description: ['']
    });
  }

  private loadReceipt(): void {
    const receipt = this.receiptService.getReceiptById(this.id());
    if (receipt) {
      this.receipt.set(receipt);
      this.form.patchValue({
        merchantName: receipt.merchantName || '',
        transactionDate: receipt.transactionDate
          ? new Date(receipt.transactionDate).toISOString().split('T')[0]
          : '',
        totalAmount: receipt.totalAmount,
        currency: receipt.currency || 'USD',
        category: receipt.category || '',
        description: receipt.description || ''
      });
    }
    this.isLoading.set(false);
  }

  getReceiptImage(): string {
    const r = this.receipt();
    return r?.localImageData || r?.blobUrl || '/assets/icons/receipt-placeholder.svg';
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.isSaving()) return;

    this.isSaving.set(true);

    const values = this.form.value;
    const updates: ReceiptUpdateRequest = {
      merchantName: values.merchantName,
      transactionDate: values.transactionDate ? new Date(values.transactionDate) : undefined,
      totalAmount: values.totalAmount,
      currency: values.currency,
      category: values.category,
      description: values.description
    };

    const result = await this.receiptService.updateReceipt(this.id(), updates);

    this.isSaving.set(false);

    if (result) {
      this.router.navigate(['/receipts', this.id()]);
    }
  }

  cancel(): void {
    this.router.navigate(['/receipts', this.id()]);
  }
}
