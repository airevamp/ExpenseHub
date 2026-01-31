import { Component, ElementRef, ViewChild, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CameraService } from '../../services/camera.service';
import { ReceiptService } from '../../services/receipt.service';

@Component({
  selector: 'app-receipt-capture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './receipt-capture.component.html',
  styleUrl: './receipt-capture.component.scss'
})
export class ReceiptCaptureComponent implements OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  private readonly cameraService = inject(CameraService);
  private readonly receiptService = inject(ReceiptService);
  private readonly router = inject(Router);

  readonly cameraState = this.cameraService.state;
  readonly capturedImage = signal<string | null>(null);
  readonly isCapturing = signal(false);
  readonly isUploading = signal(false);

  async startCamera(): Promise<void> {
    if (this.videoElement?.nativeElement) {
      await this.cameraService.startCamera(this.videoElement.nativeElement);
    }
  }

  async capturePhoto(): Promise<void> {
    if (!this.videoElement?.nativeElement) return;

    this.isCapturing.set(true);
    const blob = await this.cameraService.captureImageAsync(this.videoElement.nativeElement);

    if (blob) {
      const base64 = await this.cameraService.blobToBase64(blob);
      this.capturedImage.set(base64);
      this.cameraService.stopCamera();
    }
    this.isCapturing.set(false);
  }

  retakePhoto(): void {
    this.capturedImage.set(null);
    setTimeout(() => this.startCamera(), 100);
  }

  async saveReceipt(): Promise<void> {
    const imageData = this.capturedImage();
    if (!imageData) return;

    this.isUploading.set(true);

    // Convert base64 back to blob
    const response = await fetch(imageData);
    const blob = await response.blob();

    const receipt = await this.receiptService.createReceipt(blob);

    this.isUploading.set(false);

    if (receipt) {
      this.router.navigate(['/receipts', receipt.id, 'edit']);
    }
  }

  cancel(): void {
    this.cameraService.stopCamera();
    this.router.navigate(['/receipts']);
  }

  async handleFileInput(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const base64 = await this.cameraService.blobToBase64(file);
      this.capturedImage.set(base64);
      this.cameraService.stopCamera();
    }
  }

  ngOnDestroy(): void {
    this.cameraService.stopCamera();
  }
}
