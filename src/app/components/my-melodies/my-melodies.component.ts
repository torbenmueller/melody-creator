import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  effect,
} from '@angular/core';
import { CreationService } from '../../services/creation.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { MatModalComponent } from '../mat-modal/mat-modal.component';
import { DatePipe, isPlatformBrowser, NgClass } from '@angular/common';
import { ScoreComponent } from '../score/score.component';
import { trigger, transition, style, animate } from '@angular/animations';
import { MusicxmlConverterService } from '../../services/musicxml-converter.service';
import { FormsModule } from '@angular/forms';
import { PLATFORM_ID, inject } from '@angular/core';

@Component({
  selector: 'app-my-melodies',
  imports: [NgClass, DatePipe, ScoreComponent, FormsModule],
  templateUrl: './my-melodies.component.html',
  styleUrl: './my-melodies.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('200ms ease-out', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        style({ overflow: 'hidden' }),
        animate('150ms ease-in', style({ height: 0, opacity: 0 })),
      ]),
    ]),
  ],
})
export class MyMelodiesComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  melodies: any[] = [];
  totalMelodies: number = 0;
  melodiesPerPage: number = 10;
  currentPage: number = 1;
  isLoading: boolean = false;
  isPlaying!: boolean;
  playingMelodyId: string | null = null;
  melodyId: string = '';
  melodyName: string = '';
  // track which melody (by id) is expanded to show the score
  expandedMelodyId: string | null = null;
  selectedMelody: any = null;
  // track which melody name is being edited
  editingMelodyId: string | null = null;
  editingMelodyName: string = '';
  sortByType: string = 'time';
  order: number = -1;

  dateAscending: boolean = false;
  nameAscending: boolean = false;
  keyAscending: boolean = false;
  barsAscending: boolean = false;
  complexityAscending: boolean = false;
  beatAscending: boolean = false;

  filterBooleans: Array<boolean> = [
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ];
  filterTypes: Array<string> = [
    'name',
    'key',
    'bar',
    'complex',
    'beat',
    'license',
    'time',
  ];

  constructor(
    public creationService: CreationService,
    public musicxmlConverterService: MusicxmlConverterService,
    private toastr: ToastrService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {
    effect(() => {
      const data = this.creationService.melodiesState();
      this.melodies = data.melodies;
      this.totalMelodies = data.melodiesCount;
      this.isLoading = false;
      this.cdr.markForCheck();
    });

    effect(() => {
      const playing = this.creationService.isPlayingState();
      this.isPlaying = playing;
      if (!playing) {
        this.playingMelodyId = null;
      }
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.isLoading = true;
    this.creationService
      .getMelodies(
        this.melodiesPerPage,
        this.currentPage,
        this.sortByType,
        this.order,
      )
      .subscribe({
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  showMelody(melody: any): void {
    if (this.expandedMelodyId === melody._id) {
      this.expandedMelodyId = null;
      this.selectedMelody = null;
    } else {
      this.expandedMelodyId = melody._id;
      this.selectedMelody = melody;
    }
  }

  downloadMelodyAsXML(melody: any): void {
    this.musicxmlConverterService.downloadMusicXml(
      melody.melody,
      melody.settings.name,
      { timeSignature: melody.settings.beat, key: melody.settings.rootKey },
    );
  }

  downloadMidiFile(melodyId: any, melodyName: any) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.creationService.getMidiFile(melodyId).subscribe((response) => {
      const blob = new Blob([response.body as BlobPart], {
        type: 'audio/midi',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${melodyName}.mid`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  play(melody: any[], melodyId: string) {
    this.playingMelodyId = melodyId;
    this.creationService.play(melody);
  }

  stop() {
    this.playingMelodyId = null;
    this.creationService.stop();
  }

  openConfirmationDialog() {
    const dialogRef = this.dialog.open(MatModalComponent, {
      width: '400px',
      data: {
        title: 'Confirm Deletion',
        message: `Do you really want to delete "${this.melodyName}"?`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.delete();
      }
    });
  }

  delete() {
    this.isLoading = true;
    this.creationService.deleteMelody(this.melodyId).subscribe(
      (item) => {
        if (this.melodiesPerPage * this.currentPage >= this.totalMelodies) {
          this.goToPage(1);
        }
        this.creationService
          .getMelodies(
            this.melodiesPerPage,
            this.currentPage,
            this.sortByType,
            this.order,
          )
          .subscribe({
            error: () => {
              this.isLoading = false;
              this.cdr.markForCheck();
            },
          });
        this.showSuccess();
        this.cdr.markForCheck();
      },
      () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    );
  }

  openModal(melody: { _id: string; settings: { name: string } }) {
    this.melodyId = melody._id;
    this.melodyName = melody.settings.name;
    this.openConfirmationDialog();
  }

  showSuccess() {
    this.toastr.success('The melody was deleted successfully!');
  }

  isLessThanThreeDaysAgo(time: string | number | Date) {
    const date = new Date(time).getTime();
    const threeDaysInMilliseconds = 3 * 24 * 60 * 60 * 1000;
    const threeDaysAgo = Date.now() - threeDaysInMilliseconds;
    return date > threeDaysAgo && date <= Date.now();
  }

  filterMelodies(index: number) {
    this.toggleFilter(index);
    this.sortByType = this.filterTypes[index];
    this.order = this.filterBooleans[index] ? 1 : -1;
    this.creationService.getMelodies(
      this.melodiesPerPage,
      this.currentPage,
      this.sortByType,
      this.order,
    );
  }

  toggleFilter(index: number) {
    this.filterBooleans[index] = !this.filterBooleans[index];
    /* for (let i = 0; i < 6; i++) {
      if (i !== index) this.filterBooleans[i] = false;
      else this.filterBooleans[i] = !this.filterBooleans[i];
    } */
  }

  // Paging helpers for nav paginator
  get totalPages(): number {
    return Math.ceil(this.totalMelodies / this.melodiesPerPage) || 0;
  }

  // Windowed page list: first, last, current +/- 1 neighbor, with '...' gaps.
  get pages(): (number | '...')[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 0) return [];

    const delta = 1;
    const keep = new Set<number>([1, total]);
    for (let i = current - delta; i <= current + delta; i++) {
      if (i > 1 && i < total) keep.add(i);
    }

    const sorted = Array.from(keep).sort((a, b) => a - b);
    const result: (number | '...')[] = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev) {
        if (p - prev === 2) {
          result.push(prev + 1);
        } else if (p - prev > 2) {
          result.push('...');
        }
      }
      result.push(p);
      prev = p;
    }
    return result;
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.isLoading = true;
    this.currentPage = page;
    this.creationService
      .getMelodies(
        this.melodiesPerPage,
        this.currentPage,
        this.sortByType,
        this.order,
      )
      .subscribe({
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  startEditingName(melody: any) {
    this.editingMelodyId = melody._id;
    this.editingMelodyName = melody.settings.name;
  }

  cancelEditingName() {
    this.editingMelodyId = null;
    this.editingMelodyName = '';
  }

  saveMelodyName(melodyId: string) {
    if (!this.editingMelodyName.trim()) {
      this.toastr.error('Melody name cannot be empty');
      return;
    }

    this.creationService
      .updateMelodyName(melodyId, this.editingMelodyName)
      .subscribe({
        next: () => {
          this.toastr.success('Melody name updated successfully');
          this.editingMelodyId = null;
          this.editingMelodyName = '';
          // Reload melodies to show updated name
          this.creationService
            .getMelodies(
              this.melodiesPerPage,
              this.currentPage,
              this.sortByType,
              this.order,
            )
            .subscribe({
              error: () => {
                this.isLoading = false;
                this.cdr.markForCheck();
              },
            });
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.toastr.error('Failed to update melody name');
          console.error('Update error:', error);
          this.cdr.markForCheck();
        },
      });
  }
}
