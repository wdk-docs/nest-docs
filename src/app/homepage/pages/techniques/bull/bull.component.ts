import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BasePageComponent } from '../../page/page.component';

@Component({
  selector: 'app-bull',
  templateUrl: './bull.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BullComponent extends BasePageComponent {}
