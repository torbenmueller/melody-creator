import { Component, Inject, OnInit } from '@angular/core';
import { CreationService } from '../../services/creation.service';
import { RenderContext, Vex } from 'vexflow';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-score',
  standalone: true,
  imports: [],
  templateUrl: './score.component.html',
  styleUrl: './score.component.css'
})
export class ScoreComponent implements OnInit {
  totalMeasures: number = 0;
  composedMelody!: any[];
  melodySettings: any;
  scale!: string[];
  scoreData: any;

  constructor(
    public creationService: CreationService,
    @Inject(DOCUMENT) private document: Document
  ) { }

  ngOnInit(): void {
    this.creationService.getScoreData();
    this.creationService.scoreData.subscribe(data => {
      console.log("scoreData", data);
      this.composedMelody = data.melody;
      this.melodySettings = data.settings;
      this.scale = data.scale;
      if (this.composedMelody && this.melodySettings) this.createScore();
    });
  }
  
  createScore() {
    this.totalMeasures = 0;
    const VF = Vex.Flow;  

    const div = this.document.getElementById("score")! as HTMLDivElement;
    const div2 = this.document.getElementById("score2")! as HTMLDivElement;
    const div3 = this.document.getElementById("score3")! as HTMLDivElement;

    if (div.hasChildNodes()) {
      div.removeChild(div.childNodes[0]);
    }
    if (div2.hasChildNodes()) {
      div2.removeChild(div2.childNodes[0]);
    }
    if (div3.hasChildNodes()) {
      div3.removeChild(div3.childNodes[0]);
    }

    const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
    renderer.resize(1202, 120);
    const context = renderer.getContext();

    const renderer2 = new VF.Renderer(div2, VF.Renderer.Backends.SVG);
    if (this.melodySettings.bar > 2) renderer2.resize(1202, 120);
    else renderer2.resize(0, 0);
    const context2 = renderer2.getContext();

    const renderer3 = new VF.Renderer(div3, VF.Renderer.Backends.SVG);
    if (this.melodySettings.bar > 4) renderer3.resize(1202, 120);
    else renderer3.resize(0, 0);
    const context3 = renderer3.getContext();

    this.createMeasures(this.melodySettings, context, context2, context3);
  }

  createMeasures(settings: { bar: any; rootKey: string; scale: string; }, context: any, context2: any, context3: any) {
    const measures = settings.bar
    const { Stave, StaveNote, Beam, Formatter, Accidental, KeySignature } = Vex.Flow;

    const staveMeasure1 = new Stave(0, 0, 300);
    const staveMeasure2 = new Stave(staveMeasure1.getWidth() + staveMeasure1.getX(), 0, 300);
    const staveMeasure3 = new Stave(staveMeasure2.getWidth() + staveMeasure2.getX(), 0, 300);
    const staveMeasure4 = new Stave(staveMeasure3.getWidth() + staveMeasure3.getX(), 0, 300);
    const staveMeasure5 = new Stave(0, 0, 300);
    const staveMeasure6 = new Stave(staveMeasure5.getWidth() + staveMeasure5.getX(), 0, 300);
    const staveMeasure7 = new Stave(staveMeasure6.getWidth() + staveMeasure6.getX(), 0, 300);
    const staveMeasure8 = new Stave(staveMeasure7.getWidth() + staveMeasure7.getX(), 0, 300);
    const staveMeasure9 = new Stave(0, 0, 300);

    let notesMeasure1: any[] = [];
    let notesMeasure2: any[] = [];
    let notesMeasure3: any[] = [];
    let notesMeasure4: any[] = [];
    let notesMeasure5: any[] = [];
    let notesMeasure6: any[] = [];
    let notesMeasure7: any[] = [];
    let notesMeasure8: any[] = [];
    let notesMeasure9: any[] = [];

    let staveMeasures = [
      staveMeasure1, staveMeasure2, staveMeasure3, staveMeasure4,
      staveMeasure5, staveMeasure6, staveMeasure7, staveMeasure8
    ];

    let notesMeasures = [
      notesMeasure1, notesMeasure2, notesMeasure3, notesMeasure4,
      notesMeasure5, notesMeasure6, notesMeasure7, notesMeasure8
    ];

    const keySignature = new KeySignature(settings.rootKey);

    staveMeasure1.addClef("treble").addTimeSignature(this.melodySettings.beat);
    if (this.checkForScalesWithoutSign(settings.scale)) keySignature.addToStave(staveMeasure1);
    staveMeasure1.setContext(context).draw();

    let index = 0;

    while (this.totalMeasures < measures) {
      let measure = 0;
      let ct: RenderContext = context!;
      let beat = 1;
      if (this.melodySettings.beat === '3/4') beat = 0.75;
      while (measure < beat) {
        let duration = this.composedMelody[index].time.charAt(0);
        let note = this.composedMelody[index].note;
        let noteLowerCase = this.firstCharToLowerCase(note);
        let keys = this.addSlash(noteLowerCase);

        function addNoteWithoutAccidental(totalMeasures: number) {
          notesMeasures[totalMeasures].push(
            new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true })
          );
        }

        /* if (this.checkForHarmonicMinorScale(settings.scale)) {
          let noteAbove = this.scale[this.scale.indexOf(note) + 1];
          if (noteAbove.slice(0, -1) === settings.key) console.log(note, noteAbove.slice(0, -1), "ROOTKEY!");
        }

        if (this.checkForMelodicMinorScale(settings.scale)) {
          console.log("Melodic Minor");
        } */

        if (!this.checkForScalesWithoutSign(settings.scale)) {
          let sign = this.checkForSign(note);
          if (sign.length > 0) {
            notesMeasures[this.totalMeasures].push(
              new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true }).addModifier(new Accidental(sign), 0)
            );
          } else {
            if (index > 0 && this.composedMelody[index -1].note.length === 3) {
              let lastNote = this.removeMiddleChar(this.composedMelody[index -1].note)
              if (note === lastNote) {
                notesMeasures[this.totalMeasures].push(
                  new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true }).addModifier(new Accidental('n'), 0)
                );
              } else {
                addNoteWithoutAccidental(this.totalMeasures);
              }
            } else {
              addNoteWithoutAccidental(this.totalMeasures);
            }
          }
        } else {
          addNoteWithoutAccidental(this.totalMeasures);
        }

        measure += 1 / +duration;
        index++;
      }
      /* if (this.totalMeasures < 4) ct = context; */
      if (this.totalMeasures > 3) ct = context2;
      if (staveMeasures[this.totalMeasures] === staveMeasure5) {
        staveMeasure5.addClef("treble");
        if (this.checkForScalesWithoutSign(settings.scale)) keySignature.addToStave(staveMeasure5);
      }

      const beams = Beam.generateBeams(notesMeasures[this.totalMeasures]);
      staveMeasures[this.totalMeasures].setContext(ct).draw();
      Formatter.FormatAndDraw(ct, staveMeasures[this.totalMeasures], notesMeasures[this.totalMeasures]);
      beams.forEach(b => {
          b.setContext(ct).draw();
      });

      this.totalMeasures++;
    }

    // Add last note

    let duration = this.composedMelody[this.composedMelody.length - 1].time.charAt(0);
    let note = this.composedMelody[this.composedMelody.length - 1].note;
    let noteLowerCase = this.firstCharToLowerCase(note);
    let keys = this.addSlash(noteLowerCase);
    let sign = '';
    let rest = 'hr';
    if (this.melodySettings.beat === '3/4') rest = 'qr';
    if (!this.checkForScalesWithoutSign(settings.scale)) sign = this.checkForSign(note);

    if (measures == 2) {
      if (sign.length > 0) notesMeasure3.push(new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true }).addModifier(new Accidental(sign), 0));
      else notesMeasure3.push(new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true }));
      notesMeasure3.push(new StaveNote({ keys: ["b/4"], duration: rest }));
      staveMeasure3.setContext(context).draw();
      Formatter.FormatAndDraw(context, staveMeasure3, notesMeasure3);
    }

    if (measures == 4) {
      staveMeasure5.addClef("treble");
      if (this.checkForScalesWithoutSign(settings.scale)) keySignature.addToStave(staveMeasure5);
      staveMeasure5.setContext(context2).draw();
      if (sign.length > 0) notesMeasure5.push(new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true }).addModifier(new Accidental(sign), 0));
      else notesMeasure5.push(new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true }));
      notesMeasure5.push(new StaveNote({ keys: ["b/4"], duration: rest }));
      staveMeasure5.setContext(context2).draw();
      Formatter.FormatAndDraw(context2, staveMeasure5, notesMeasure5);
    }

    if (measures == 8) {
      staveMeasure9.addClef("treble");
      if (this.checkForScalesWithoutSign(settings.scale)) keySignature.addToStave(staveMeasure9);
      staveMeasure9.setContext(context3).draw();
      if (sign.length > 0) notesMeasure9.push(new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true }).addModifier(new Accidental(sign), 0));
      else notesMeasure9.push(new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true }));
      notesMeasure9.push(new StaveNote({ keys: ["b/4"], duration: rest }));
      staveMeasure9.setContext(context3).draw();
      Formatter.FormatAndDraw(context3, staveMeasure9, notesMeasure9);
    }

  }

  firstCharToLowerCase(str: string) {
    if (str.length === 0) return str;
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  addSlash(str: string) {
    if (str.length === 0) return str;
    if (str.length === 2) {
      return str.charAt(0) + "/" + str.slice(1);
    }
    return str.slice(0, 2) + "/" + str.slice(2);
  }

  checkForHarmonicMinorScale(scale: string) {
    if (scale === "Harmonic Minor") return true;
    return false;
  }

  checkForMelodicMinorScale(scale: string) {
    if (scale === "Melodic Minor") return true;
    return false;
  }

  checkForScalesWithoutSign(scale: string) {
    const scalesWithoutSign = [
      scale !== "Harmonic Minor",
      scale !== "Melodic Minor",
      scale !== "Chromatic",
      scale !== "Whole Tone"
    ];
    if (scalesWithoutSign.every(condition => condition)) {
      return true;
    }
    return false;
    /* if (scale !== "Chromatic" && scale !== "Whole Tone") return true;
    return false; */
  }

  checkForSign(note: string) {
    let sign = '';
    if (note.length === 3) sign = this.getSign(note);
    return sign;
  }

  getSign(note: string) {
    return note[1];
  }

  removeMiddleChar(note: string) {
    return note.substring(0, 1) + note.substring(2);
  }
}
