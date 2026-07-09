import {ChangeDetectionStrategy, Component} from '@angular/core';
import {DashboardComponent} from './dashboard.component';
import {ToastComponent} from './components/toast.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [DashboardComponent, ToastComponent],
  template: '<app-dashboard></app-dashboard><app-toast></app-toast>'
})
export class App {}
