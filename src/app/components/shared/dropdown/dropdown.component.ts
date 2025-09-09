import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.css'],
})
export class DropdownComponent<T> {
  @Input() options: T[] = [];
  @Input() selectedOption: T | null = null;
  @Input() placeholder: string = 'Select an option';
  @Input() displayFn: (option: T) => string = (option: T) => String(option);

  /* @Output() selectedOptionChange = new EventEmitter<T>(); */

  @Output() selectedOptionChange = new EventEmitter<string>();

  selectOption(option: T) {
    this.selectedOptionChange.emit(this.displayFn(option));
    this.isOpen = false;
  }

  isOpen = false;

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  /* selectOption(option: T, event: Event): void {
    event.stopPropagation();
    this.selectedOption = option;
    this.selectedOptionChange.emit(option);
    this.isOpen = false;
  } */

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      this.isOpen = false;
    }
  }

  trackByFn(index: number, item: T): number {
    return index;
  }
}
