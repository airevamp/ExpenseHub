import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type LoadingType = 'spinner' | 'skeleton' | 'overlay';

@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-indicator.component.html',
  styleUrl: './loading-indicator.component.scss'
})
export class LoadingIndicatorComponent {
  readonly type = input<LoadingType>('spinner');
  readonly message = input<string>('');
  readonly lines = input(3);

  skeletonLines(): number[] {
    return Array.from({ length: this.lines() }, (_, i) => i);
  }

  getRandomWidth(): string {
    const widths = ['100%', '85%', '70%', '90%', '75%'];
    return widths[Math.floor(Math.random() * widths.length)];
  }
}
