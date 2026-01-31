import { Injectable, signal } from '@angular/core';

export interface CameraState {
  isActive: boolean;
  hasPermission: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private stream: MediaStream | null = null;

  readonly state = signal<CameraState>({
    isActive: false,
    hasPermission: false,
    error: null
  });

  async startCamera(videoElement: HTMLVideoElement): Promise<boolean> {
    try {
      // Request camera with back camera preference for mobile
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = this.stream;
      await videoElement.play();

      this.state.set({
        isActive: true,
        hasPermission: true,
        error: null
      });

      return true;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.state.set({
        isActive: false,
        hasPermission: false,
        error: errorMessage
      });
      return false;
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.state.set({
      isActive: false,
      hasPermission: this.state().hasPermission,
      error: null
    });
  }

  captureImage(videoElement: HTMLVideoElement): Blob | null {
    if (!this.stream || !videoElement.videoWidth) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    ctx.drawImage(videoElement, 0, 0);

    // Convert to blob synchronously using toDataURL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return this.dataUrlToBlob(dataUrl);
  }

  async captureImageAsync(videoElement: HTMLVideoElement): Promise<Blob | null> {
    if (!this.stream || !videoElement.videoWidth) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    ctx.drawImage(videoElement, 0, 0);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        0.9
      );
    });
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async checkCameraAvailable(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          return 'Camera permission denied. Please allow camera access in your browser settings.';
        case 'NotFoundError':
          return 'No camera found on this device.';
        case 'NotReadableError':
          return 'Camera is already in use by another application.';
        case 'OverconstrainedError':
          return 'Camera does not meet the required constraints.';
        default:
          return `Camera error: ${error.message}`;
      }
    }
    return 'An unexpected error occurred while accessing the camera.';
  }
}
