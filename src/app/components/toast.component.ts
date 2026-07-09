import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../services/toast.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="pointer-events-auto flex items-center gap-3 min-w-[300px] p-4 rounded-xl shadow-xl border text-sm font-medium transition-all toast-enter"
             [class]="getClasses(toast.type)">
          <mat-icon class="!w-5 !h-5 !text-[20px] shrink-0">{{ getIcon(toast.type) }}</mat-icon>
          <span class="flex-1">{{ toast.message }}</span>
          <button (click)="toastService.remove(toast.id)" class="opacity-50 hover:opacity-100 transition-opacity shrink-0 flex">
            <mat-icon class="!w-4 !h-4 !text-[16px]">close</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  host: {
    class: 'block'
  }
})
export class ToastComponent {
  toastService = inject(ToastService);

  getClasses(type: ToastType): string {
    switch (type) {
      case 'success': return 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400';
      case 'error': return 'bg-red-950/90 border-red-500/30 text-red-400';
      case 'warning': return 'bg-amber-950/90 border-amber-500/30 text-amber-400';
      case 'info':
      default: return 'bg-slate-900/90 border-slate-700 text-slate-300';
    }
  }

  getIcon(type: ToastType): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error_outline';
      case 'warning': return 'warning_amber';
      case 'info':
      default: return 'info_outline';
    }
  }
}
