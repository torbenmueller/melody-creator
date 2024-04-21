import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-modal-dialog',
  standalone: true,
  imports: [],
  templateUrl: './modal-dialog.component.html',
  styleUrl: './modal-dialog.component.css'
})
export class ModalDialogComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<ModalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
