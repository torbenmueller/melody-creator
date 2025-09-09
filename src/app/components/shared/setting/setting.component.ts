import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Settings } from '../../../interfaces/settings';
import { DropdownComponent } from '../dropdown/dropdown.component';

@Component({
  selector: 'app-setting',
  standalone: true,
  imports: [DropdownComponent],
  templateUrl: './setting.component.html',
  styleUrl: './setting.component.css'
})
export class SettingComponent {
  @Input() settings!: Settings;
  @Input() options!: string[];
  @Input() category!: string;
  @Input() icon!: string;
  
  @Output() selectedOption = new EventEmitter<string>();

  handleSelectedOptionChange(option: string) {
    this.selectedOption.emit(option);
  }
}
