import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CreationService } from '../../services/creation.service';
import { RenderContext, Vex } from 'vexflow';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-score',
  standalone: true,
  imports: [],
  templateUrl: './score.component.html',
  styleUrl: './score.component.css'
})
export class ScoreComponent implements OnInit, AfterViewInit, OnDestroy {
  totalMeasures: number = 0;
  composedMelody!: any[];
  melodySettings: any;
  scale!: string[];
  scoreData: any;
  private viewReady = false;
  private dataReady = false;
  private sub?: Subscription;

  @ViewChild('scoreEl', { static: false }) scoreEl!: ElementRef<HTMLDivElement>;
  @ViewChild('score2El', { static: false }) score2El!: ElementRef<HTMLDivElement>;
  @ViewChild('score3El', { static: false }) score3El!: ElementRef<HTMLDivElement>;

  constructor(
    public creationService: CreationService
  ) { }

  ngOnInit(): void {
    this.sub = this.creationService.scoreData.subscribe(data => {
      console.log("scoreData", data);
      this.composedMelody = data.melody;
      this.melodySettings = data.settings;
      this.scale = data.scale;
      this.dataReady = !!(this.composedMelody && this.melodySettings && this.melodySettings.bar != null);
      if (this.viewReady && this.dataReady) this.createScore();
    });
    // request current score data after subscribing, so we don't miss the emission
    this.creationService.getScoreData();
  }
  
  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
  
  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.dataReady) this.createScore();
  }
  
  createScore() {
    this.totalMeasures = 0;
    const VF = Vex.Flow;  
    const div = this.scoreEl?.nativeElement as HTMLDivElement;
    const div2 = this.score2El?.nativeElement as HTMLDivElement;
    const div3 = this.score3El?.nativeElement as HTMLDivElement;
    
    // Clear existing content
    if (div) div.innerHTML = '';
    if (div2) div2.innerHTML = '';
    if (div3) div3.innerHTML = '';

    // Create first renderer (always needed)
    const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
    renderer.resize(1202, 120);
    const context = renderer.getContext();
    
    let context2: any = null;
    let context3: any = null;
    
    // Only create second renderer if we have more than 2 bars
    if (this.melodySettings && this.melodySettings.bar > 2) {
      const renderer2 = new VF.Renderer(div2, VF.Renderer.Backends.SVG);
      renderer2.resize(1202, 120);
      context2 = renderer2.getContext();
      
      // Only create third renderer if we have more than 4 bars
      if (this.melodySettings && this.melodySettings.bar > 4) {
        const renderer3 = new VF.Renderer(div3, VF.Renderer.Backends.SVG);
        renderer3.resize(1202, 120);
        context3 = renderer3.getContext();
      }
    }

    this.createMeasures(this.melodySettings, context, context2, context3);
  }

  createMeasures(settings: { bar: any; rootKey: string; scale: string; }, context: any, context2: any, context3: any) {
    const measures = settings.bar
    const { Stave, StaveNote, Beam, Formatter, Accidental, KeySignature, Dot } = Vex.Flow;

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
        const timeToken = this.composedMelody[index].time;
        let duration = timeToken.charAt(0);
        const isDotted = timeToken.length > 2 || timeToken.includes('.');
        let note = this.composedMelody[index].note;
        let noteLowerCase = this.firstCharToLowerCase(note);
        let keys = this.addSlash(noteLowerCase);

        function addNoteWithoutAccidental(totalMeasures: number) {
          const n = new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true });
          if (isDotted) Dot.buildAndAttach([n], { all: true });
          notesMeasures[totalMeasures].push(n);
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
            const n = new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true });
            if (isDotted) Dot.buildAndAttach([n], { all: true });
            notesMeasures[this.totalMeasures].push(
              n.addModifier(new Accidental(sign), 0)
            );
          } else {
            if (index > 0 && this.composedMelody[index -1].note.length === 3) {
              let lastNote = this.removeMiddleChar(this.composedMelody[index -1].note)
              if (note === lastNote) {
                const n2 = new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true });
                if (isDotted) Dot.buildAndAttach([n2], { all: true });
                notesMeasures[this.totalMeasures].push(
                  n2.addModifier(new Accidental('n'), 0)
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

        let incr = 1 / +duration;
        if (isDotted) incr *= 1.5;
        measure += incr;
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
    const timeTokenLast = this.composedMelody[this.composedMelody.length - 1].time;
    let duration = timeTokenLast.charAt(0);
    const isDottedLast = timeTokenLast.length > 2 || timeTokenLast.includes('.');
    console.log("Last note duration", timeTokenLast);
    let note = this.composedMelody[this.composedMelody.length - 1].note;
    let noteLowerCase = this.firstCharToLowerCase(note);
    let keys = this.addSlash(noteLowerCase);
    let sign = '';

    if (!this.checkForScalesWithoutSign(settings.scale)) sign = this.checkForSign(note);

    if (measures == 2) {
      if (sign.length > 0) {
        const n = new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true });
        if (isDottedLast) Dot.buildAndAttach([n], { all: true });
        notesMeasure3.push(n.addModifier(new Accidental(sign), 0));
      } else {
        const n = new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true });
        if (isDottedLast) Dot.buildAndAttach([n], { all: true });
        notesMeasure3.push(n);
      }
      staveMeasure3.setContext(context).draw();
      Formatter.FormatAndDraw(context, staveMeasure3, notesMeasure3);
    }

    if (measures == 4) {
      staveMeasure5.addClef("treble");
      if (this.checkForScalesWithoutSign(settings.scale)) keySignature.addToStave(staveMeasure5);
      staveMeasure5.setContext(context2).draw();
      if (sign.length > 0) {
        const n = new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true });
        if (isDottedLast) Dot.buildAndAttach([n], { all: true });
        notesMeasure5.push(n.addModifier(new Accidental(sign), 0));
      } else {
        const n = new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true });
        if (isDottedLast) Dot.buildAndAttach([n], { all: true });
        notesMeasure5.push(n);
      }
      staveMeasure5.setContext(context2).draw();
      Formatter.FormatAndDraw(context2, staveMeasure5, notesMeasure5);
    }

    if (measures == 8) {
      staveMeasure9.addClef("treble");
      if (this.checkForScalesWithoutSign(settings.scale)) keySignature.addToStave(staveMeasure9);
      staveMeasure9.setContext(context3).draw();
      if (sign.length > 0) {
        const n = new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true });
        if (isDottedLast) Dot.buildAndAttach([n], { all: true });
        notesMeasure9.push(n.addModifier(new Accidental(sign), 0));
      } else {
        const n = new StaveNote({ clef: 'treble', keys: [keys], duration: duration, auto_stem: true });
        if (isDottedLast) Dot.buildAndAttach([n], { all: true });
        notesMeasure9.push(n);
      }
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
