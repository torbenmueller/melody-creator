import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  inject,
} from '@angular/core';


@Component({
    selector: 'app-dropdown',
    imports: [],
    templateUrl: './dropdown.component.html',
    styleUrls: ['./dropdown.component.css']
})
export class DropdownComponent {
  private readonly hostElement = inject(ElementRef<HTMLElement>);

  @Input() options: string[] = [];
  @Input() selectedOption: string | null = null;
  @Input() placeholder: string = '';
  @Input() ariaLabel: string = '';
  
  @Output() selectedOptionChange = new EventEmitter<string>();

  isOpen = false;

  selectOption(option: string): void {
    this.selectedOption = option;
    this.selectedOptionChange.emit(option);
    this.isOpen = false;
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  onToggleClick(event: MouseEvent): void {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    this.toggleDropdown();
  }

  onToggleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.toggleDropdown();
  }

  onOptionClick(event: MouseEvent, option: string): void {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    this.selectOption(option);
  }

  onOptionKeydown(event: KeyboardEvent, option: string): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.selectOption(option);
  }

  @HostListener('document:pointerdown', ['$event'])
  onPointerDownOutside(event: PointerEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!this.hostElement.nativeElement.contains(target)) {
      this.isOpen = false;
    }
  }

  trackByFn(index: number, item: string): string {
    return `${index}-${item}`;
  }
}
