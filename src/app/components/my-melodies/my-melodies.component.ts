import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { CreationService } from '../../services/creation.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { MatModalComponent } from '../mat-modal/mat-modal.component';
import { DatePipe, NgClass } from '@angular/common';
import { ScoreComponent } from '../score/score.component';
import { trigger, transition, style, animate } from '@angular/animations';
import { MusicxmlConverterService } from '../../services/musicxml-converter.service';

@Component({
  selector: 'app-my-melodies',
  standalone: true,
  imports: [NgClass, DatePipe, ScoreComponent],
  templateUrl: './my-melodies.component.html',
  styleUrl: './my-melodies.component.css',
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
export class MyMelodiesComponent implements OnInit, OnDestroy {
  private melodiesSub!: Subscription;
  melodies: any[] = [];
  totalMelodies: number = 0;
  melodiesPerPage: number = 10;
  currentPage: number = 1;
  isLoading: boolean = false;
  isPlaying!: boolean;
  melodyId: string = '';
  melodyName: string = '';
  // track which melody (by id) is expanded to show the score
  expandedMelodyId: string | null = null;
  sortByType: string = 'time';
  order: number = -1;

  dateAscending: boolean = false;
  nameAscending: boolean = false;
  keyAscending: boolean = false;
  barsAscending: boolean = false;
  complexityAscending: boolean = false;
  beatAscending: boolean = false;

  filterBooleans: Array<boolean> = [false, false, false, false, false, false];
  filterTypes: Array<string> = [
    'name',
    'key',
    'bar',
    'complex',
    'beat',
    'time',
  ];

  constructor(
    public creationService: CreationService,
    public musicxmlConverterService: MusicxmlConverterService,
    private toastr: ToastrService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.load();
    this.creationService.isPlaying.subscribe((e) => {
      this.isPlaying = e;
    });
  }

  ngOnDestroy(): void {
    this.melodiesSub?.unsubscribe();
  }

  load() {
    this.isLoading = true;
    this.creationService.getMelodies(
      this.melodiesPerPage,
      this.currentPage,
      this.sortByType,
      this.order
    );
    this.melodiesSub = this.creationService
      .getMelodiesUpdateListener()
      .subscribe((data: { melodies: any; melodiesCount: number }) => {
        this.melodies = data.melodies;
        this.totalMelodies = data.melodiesCount;
        this.isLoading = false;
      });
  }

  showMelody(melody: any): void {
    // toggle expanded view for the clicked melody
    if (this.expandedMelodyId === melody._id) {
      // collapse
      this.expandedMelodyId = null;
    } else {
      // expand this melody and push score data to service
      this.expandedMelodyId = melody._id;
      this.creationService.setMelody(melody);
    }
  }

  convertMelodyToMusicXML(
    melody: { note: string; time: string }[],
    title: string,
    timeSignature: '3/4' | '4/4' = '4/4'
  ): string {
    const beatPerMeasure = timeSignature === '3/4' ? 3 : 4;

    const durationMap: Record<
      string,
      { type: string; beats: number; dot?: boolean }
    > = {
      '1m': { type: 'whole', beats: beatPerMeasure },
      '2n': { type: 'half', beats: 2 },
      '2n.': { type: 'half', beats: 3, dot: true },
      '4n': { type: 'quarter', beats: 1 },
      '4n.': { type: 'quarter', beats: 1.5, dot: true },
      '8n': { type: 'eighth', beats: 0.5 },
      '8n.': { type: 'eighth', beats: 0.75, dot: true },
    };

    let currentBeats = 0;
    let measureIndex = 1;

    let measuresXML = `<measure number="${measureIndex}">`;

    melody.forEach((entry) => {
      const { note, time } = entry;
      const map = durationMap[time];
      const step = note[0];
      const octave = note.slice(1);

      measuresXML += `
      <note>
        <pitch>
          <step>${step}</step>
          <octave>${octave}</octave>
        </pitch>
        <type>${map.type}</type>
        ${map.dot ? "<dot/>" : ""}
      </note>
    `;

      currentBeats += map.beats;

      if (currentBeats >= beatPerMeasure) {
        currentBeats = 0;
        measureIndex++;
        measuresXML += `</measure><measure number="${measureIndex}">`;
      }
    });

    measuresXML += `</measure>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
  <score-partwise version="3.1">
    <work>
      <work-title>${title}</work-title>
    </work>
    <part-list>
      <score-part id="P1">
        <part-name>${title}</part-name>
      </score-part>
    </part-list>
    <part id="P1">
      ${measuresXML}
    </part>
  </score-partwise>`;
  }

 /*  downloadMelodyAsXML(melody: any): void {
    console.log('Downloading melody as MusicXML:', melody);
    const xml = this.convertMelodyToMusicXML(
      melody.melody,
      melody.settings.name,
      melody.settings.beat
    );

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${melody.settings.name}.xml`;
    a.click();

    URL.revokeObjectURL(url);
  } */

  downloadMelodyAsXML(melody: any): void {
    console.log(melody)
    this.musicxmlConverterService.downloadMusicXml(
      melody.melody,
      melody.settings.name,
      { timeSignature: melody.settings.beat, key: melody.settings.rootKey }
    );
  }

  downloadMidiFile(melodyId: any, melodyName: any) {
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

  play(melody: any[]) {
    this.creationService.play(melody);
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
        this.creationService.getMelodies(
          this.melodiesPerPage,
          this.currentPage,
          this.sortByType,
          this.order
        );
        this.showSuccess();
      },
      () => {
        this.isLoading = false;
      }
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
      this.order
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

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.isLoading = true;
    this.currentPage = page;
    this.creationService.getMelodies(
      this.melodiesPerPage,
      this.currentPage,
      this.sortByType,
      this.order
    );
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
}
