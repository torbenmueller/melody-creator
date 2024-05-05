import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { CreationService } from '../../services/creation.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ModalDialogComponent } from '../modal-dialog/modal-dialog.component';
import { DatePipe, NgClass } from '@angular/common';

@Component({
  selector: 'app-my-melodies',
  standalone: true,
  imports: [NgClass, DatePipe, MatPaginatorModule],
  templateUrl: './my-melodies.component.html',
  styleUrl: './my-melodies.component.css'
})
export class MyMelodiesComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private melodiesSub!: Subscription;
  melodies: any = [];
  totalMelodies: number = 0;
  melodiesPerPage: number = 10;
  currentPage: number = 1;
  pageSizeOptions: Array<number> = [10, 25, 50];
  isLoading: boolean = false;
  isPlaying!: boolean;
  melodyId: string = '';
  melodyName: string = '';
  sortByType: string = "time";
  order: number = -1;

  dateAscending: boolean = false;
  nameAscending: boolean = false;
  keyAscending: boolean = false;
  barsAscending: boolean = false;
  complexityAscending: boolean = false;
  beatAscending: boolean = false;

  filterBooleans: Array<boolean> = [false, false, false, false, false, false];
  filterTypes: Array<string> = ["name", "key", "bar", "complex", "beat", "time"];

  constructor(
    public creationService: CreationService,
    /* private toastr: ToastrService, */
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.load();
    this.creationService.isPlaying.subscribe(e => {
			this.isPlaying = e;
		});
  }

  ngOnDestroy(): void {
    this.melodiesSub.unsubscribe();
  }

  onChangedPage(pageData: PageEvent) {
    this.isLoading = true;
    this.currentPage = pageData.pageIndex + 1;
    this.melodiesPerPage = pageData.pageSize;
    this.creationService.getMelodies(this.melodiesPerPage, this.currentPage, this.sortByType, this.order);
  }

  load() {
    this.isLoading = true;
    this.creationService.getMelodies(this.melodiesPerPage, this.currentPage, this.sortByType, this.order);
    this.melodiesSub = this.creationService.getMelodiesUpdateListener()
      .subscribe((data: {melodies: any, melodiesCount: number}) => {
        this.melodies = data.melodies;
        this.totalMelodies = data.melodiesCount;
        this.isLoading = false;
      });
	}

  downloadMidiFile(melodyId: any, melodyName: any) {
    this.creationService.getMidiFile(melodyId).subscribe(response => {
      const blob = new Blob([response.body as BlobPart], { type: 'audio/midi' });
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

  openConfirmationDialog(): void {
    const dialogRef = this.dialog.open(ModalDialogComponent, {
      width: '300px',
      data: {
        title: 'Confirm Deletion',
        message: `Do you really want to delete "${this.melodyName}"?`,
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.delete();
      }
    });
  }

  delete() {
    this.isLoading = true;
    this.creationService.deleteMelody(this.melodyId).subscribe(item => {
      if (this.melodiesPerPage * this.currentPage >= this.totalMelodies) {
        this.paginator.firstPage();
        /* this.showSuccess();
        return; */
      }
      this.creationService.getMelodies(this.melodiesPerPage, this.currentPage, this.sortByType, this.order);
      /* this.showSuccess(); */
    }, () => {
      this.isLoading = false;
    });
  }

  openModal(melody: { _id: string; settings: { name: string; }; }) {
    this.melodyId = melody._id;
    this.melodyName = melody.settings.name;
    this.openConfirmationDialog();
  }

  /* showSuccess() {
    this.toastr.success('The melody was deleted successfully!');
  } */

  isLessThanThreeDaysAgo(time: string | number | Date) {
    const date = new Date(time).getTime();
    const threeDaysInMilliseconds = 3 * 24 * 60 * 60 * 1000;
    const threeDaysAgo = Date.now() - threeDaysInMilliseconds;
    return date > threeDaysAgo && date <= Date.now();
  }

  filterMelodies(index: number) {
    // this.isLoading = true;
    this.toggleFilter(index);
    this.sortByType = this.filterTypes[index];
    if (this.filterBooleans[index] === true) this.order = 1;
    else this.order = -1;
    this.creationService.getMelodies(this.melodiesPerPage, this.currentPage, this.sortByType, this.order);
  }

  toggleFilter(index: number) {
    for (let i = 0; i < 6; i++) {
      if (i !== index) this.filterBooleans[i] = false;
      else this.filterBooleans[i] = !this.filterBooleans[i];
    }
  }
}
