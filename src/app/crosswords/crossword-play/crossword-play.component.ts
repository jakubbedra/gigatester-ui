import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';
import { CrosswordStateClueResponse, CrosswordStateResponse } from '../../models/models.d';
import { CrosswordStateService } from '../../service/crossword-state.service';
import { CrosswordStateUpdateRequest } from '../../models/models.d';
import { StreakService } from '../../service/streak.service';
import { ToastService } from '../../service/toast.service';
import { TranslateService } from '@ngx-translate/core';

export interface NumberedClue {
  number: number;
  clue: CrosswordStateClueResponse;
  length: number;
}

export interface CellData {
  char: string;
  placed: boolean;
  number?: number;
  highlighted: boolean;
}

@Component({
  selector: 'app-crossword-play',
  templateUrl: './crossword-play.component.html',
  styleUrls: ['./crossword-play.component.css']
})
export class CrosswordPlayComponent implements OnInit, AfterViewInit, OnDestroy {

  state!: CrosswordStateResponse;
  across: NumberedClue[] = [];
  down: NumberedClue[] = [];
  selectedClue: NumberedClue | null = null;
  cellNumberMap = new Map<string, number>();
  highlightedCells = new Set<string>();
  activeTab: 'across' | 'down' = 'across';

  crosswordId: string | null = null;
  handLetters: string[] = [];
  placedLetters = new Map<string, { letter: string; handIndex: number }>();
  placedCount = 0;
  isDragging = false;
  hoveredCell: string | null = null;
  cellSize = 38;
  mobileCellSize = 32;
  isSubmitting = false;

  flashCorrect = new Set<string>();
  flashWrong = new Set<string>();
  flashBot = new Set<string>();
  flashDelay = new Map<string, number>();
  wordToasts: { word: string; points: number }[] = [];

  showWinner = false;
  winner: 'human' | 'bot' | 'tie' | null = null;

  get isComplete(): boolean {
    return !!this.state && !this.state.currentGrid.includes('_');
  }

  @ViewChild('gridScroll') gridScrollEl!: ElementRef<HTMLElement>;
  private resizeObserver!: ResizeObserver;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private crosswordStateService: CrosswordStateService,
    private streakService: StreakService,
    private toastService: ToastService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.crosswordId = this.route.snapshot.queryParamMap.get('cid');
    this.crosswordStateService.getCrosswordState(id).subscribe(state => {
      this.state = state;
      this.crosswordId = state.crosswordId ?? this.crosswordId;
      this.buildClues();
      const human = state.players.find(p => !p.bot);
      this.handLetters = human?.handLetters
        ? human.handLetters.split('')
        : [];
      while (this.handLetters.length < 5) this.handLetters.push('');
      setTimeout(() => this.updateCellSize(), 0);
    });
  }

  ngAfterViewInit() {
    this.resizeObserver = new ResizeObserver(() => this.updateCellSize());
    this.resizeObserver.observe(this.gridScrollEl.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  zoomIn()  { this.mobileCellSize = Math.min(this.mobileCellSize + 4, 56); this.applyMobileSize(); }
  zoomOut() { this.mobileCellSize = Math.max(this.mobileCellSize - 4, 16); this.applyMobileSize(); }
  private applyMobileSize() { if (window.innerWidth <= 768) this.cellSize = this.mobileCellSize; }

  private updateCellSize() {
    if (!this.state || !this.gridScrollEl) return;
    if (window.innerWidth <= 768) {
      this.cellSize = this.mobileCellSize;
      return;
    }
    const el = this.gridScrollEl.nativeElement;
    const maxByWidth  = Math.floor(el.clientWidth  / this.state.width);
    const maxByHeight = Math.floor(el.clientHeight / this.state.height);
    this.cellSize = Math.max(20, Math.min(maxByWidth, maxByHeight));
  }

  get humanPlayer() {
    return this.state?.players.find(p => !p.bot) ?? null;
  }

  get botPlayer() {
    return this.state?.players.find(p => p.bot) ?? null;
  }

  private buildClues() {
    const sorted = [...this.state.clues].sort((a, b) =>
      a.row !== b.row ? a.row - b.row : a.column - b.column
    );

    let counter = 1;
    for (const clue of sorted) {
      const key = `${clue.row},${clue.column}`;
      if (!this.cellNumberMap.has(key)) {
        this.cellNumberMap.set(key, counter++);
      }
    }

    const across: NumberedClue[] = [];
    const down: NumberedClue[] = [];

    for (const clue of sorted) {
      const key = `${clue.row},${clue.column}`;
      const number = this.cellNumberMap.get(key)!;
      const length = this.wordLength(clue);
      const entry = { number, clue, length };
      if (clue.direction === 'ACROSS') across.push(entry);
      else down.push(entry);
    }

    this.across = across.sort((a, b) => a.number - b.number);
    this.down = down.sort((a, b) => a.number - b.number);
  }

  private wordLength(clue: CrosswordStateClueResponse): number {
    let len = 0;
    let r = clue.row, c = clue.column;
    while (r < this.state.height && c < this.state.width) {
      if (this.state.currentGrid[r * this.state.width + c] === '#') break;
      len++;
      if (clue.direction === 'ACROSS') c++; else r++;
    }
    return len;
  }

  selectClue(entry: NumberedClue) {
    this.selectedClue = entry;
    this.highlightedCells.clear();
    let r = entry.clue.row, c = entry.clue.column;
    for (let i = 0; i < entry.length; i++) {
      this.highlightedCells.add(`${r},${c}`);
      if (entry.clue.direction === 'ACROSS') c++; else r++;
    }
  }

  isActive(entry: NumberedClue): boolean {
    return this.selectedClue?.number === entry.number &&
           this.selectedClue?.clue.direction === entry.clue.direction;
  }

  rows(): CellData[][] {
    if (!this.state) return [];
    const result: CellData[][] = [];
    for (let r = 0; r < this.state.height; r++) {
      const row: CellData[] = [];
      for (let c = 0; c < this.state.width; c++) {
        const gridChar = this.state.currentGrid[r * this.state.width + c];
        const key = `${r},${c}`;
        const placement = this.placedLetters.get(key);
        row.push({
          char: placement?.letter ?? gridChar,
          placed: !!placement,
          number: this.cellNumberMap.get(key),
          highlighted: this.highlightedCells.has(key)
        });
      }
      result.push(row);
    }
    return result;
  }

  onDragStarted() {
    this.isDragging = true;
    this.hoveredCell = null;
  }

  onDragMoved(event: CdkDragMove) {
    const target = document.elementFromPoint(event.pointerPosition.x, event.pointerPosition.y) as HTMLElement | null;
    const cellEl = target?.closest<HTMLElement>('[data-cell-row]');
    if (cellEl) {
      const row = parseInt(cellEl.dataset['cellRow']!);
      const col = parseInt(cellEl.dataset['cellCol']!);
      if (this.isEmptyForDrop(row, col)) {
        this.hoveredCell = `${row},${col}`;
        return;
      }
    }
    this.hoveredCell = null;
  }

  onDrop(event: CdkDragEnd, letter: string, handIndex: number) {
    this.isDragging = false;
    this.hoveredCell = null;

    const el = event.source.element.nativeElement as HTMLElement;
    el.style.visibility = 'hidden';
    const target = document.elementFromPoint(event.dropPoint.x, event.dropPoint.y) as HTMLElement | null;
    el.style.visibility = '';

    const cellEl = target?.closest<HTMLElement>('[data-cell-row]');
    if (cellEl) {
      const row = parseInt(cellEl.dataset['cellRow']!);
      const col = parseInt(cellEl.dataset['cellCol']!);
      const key = `${row},${col}`;
      const gridChar = this.state.currentGrid[row * this.state.width + col];
      const alreadyPlaced = this.placedLetters.has(key);

      if (gridChar === '_' && !alreadyPlaced) {
        this.placedLetters.set(key, { letter, handIndex });
        this.placedCount++;
        this.handLetters = this.handLetters.map((l, i) => i === handIndex ? '' : l);
        event.source._dragRef.reset();
        return;
      }
    }

    event.source._dragRef.reset();
  }

  submit() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const request: CrosswordStateUpdateRequest = {
      letters: Array.from(this.placedLetters.entries()).map(([key, val]) => {
        const [row, column] = key.split(',').map(Number);
        return { c: val.letter, row, column };
      })
    };

    this.crosswordStateService.updateCrosswordState(this.state.id, request).subscribe({
      next: (updated) => {
        this.applyFlash(updated);
        this.state = updated;
        this.placedLetters.clear();
        this.placedCount = 0;
        this.hoveredCell = null;
        const human = updated.players.find(p => !p.bot);
        this.handLetters = human?.handLetters ? human.handLetters.split('') : [];
        while (this.handLetters.length < 5) this.handLetters.push('');
        this.isSubmitting = false;
        setTimeout(() => this.updateCellSize(), 0);
      },
      error: () => { this.isSubmitting = false; }
    });
  }

  private applyFlash(updated: typeof this.state) {
    const correct = new Set<string>();
    const wrong = new Set<string>();
    const bot = new Set<string>();
    const delays = new Map<string, number>();

    const turn = updated.lastTurn;
    if (turn) {
      let humanIdx = 0;
      for (const r of turn.humanResults) {
        const key = `${r.row},${r.column}`;
        if (r.correct) correct.add(key); else wrong.add(key);
        delays.set(key, humanIdx * 300);
        humanIdx++;
      }
      let botIdx = 0;
      for (const r of turn.botPlacements) {
        const key = `${r.row},${r.column}`;
        bot.add(key);
        delays.set(key, botIdx * 300);
        botIdx++;
      }
    }

    this.flashDelay = delays;
    this.flashCorrect = correct;
    this.flashWrong = wrong;

    const humanCount = correct.size + wrong.size;
    const humanDuration = 1800 + Math.max(0, humanCount - 1) * 300;

    if (turn?.humanCompletedWords?.length) {
      setTimeout(() => {
        this.wordToasts = turn.humanCompletedWords.map(w => ({ word: w.word, points: w.points }));
        setTimeout(() => { this.wordToasts = []; }, 2500);
      }, humanDuration);
    }

    setTimeout(() => {
      this.flashCorrect = new Set();
      this.flashWrong = new Set();
      this.flashBot = bot;

      const botDuration = 3000 + (bot.size - 1) * 300;
      setTimeout(() => {
        this.flashBot = new Set();
        this.flashDelay = new Map();
        if (this.isComplete) {
          const h = this.humanPlayer?.points ?? 0;
          const b = this.botPlayer?.points ?? 0;
          this.winner = h > b ? 'human' : b > h ? 'bot' : 'tie';
          setTimeout(() => { this.showWinner = true; }, 1000);
          this.streakService.getStreak().subscribe(s => {
            if (s.currentStreak > 0) {
              const label = this.translate.instant('SIDEBAR.STREAK');
              this.toastService.show({ icon: '🔥', message: `${s.currentStreak} ${label}` });
            }
          });
        }
      }, botDuration);
    }, humanDuration + 500);
  }

  newCrossword() {
    if (this.crosswordId) {
      this.router.navigate(['/crosswords', this.crosswordId]);
    } else {
      this.router.navigate(['/admin/crosswords']);
    }
  }


  recallPlaced(row: number, col: number) {
    const key = `${row},${col}`;
    const placement = this.placedLetters.get(key);
    if (!placement) return;
    this.handLetters = this.handLetters.map((l, i) =>
      i === placement.handIndex ? placement.letter : l
    );
    this.placedLetters.delete(key);
    this.placedCount--;
  }

  isHoveredCell(row: number, col: number): boolean {
    return this.hoveredCell === `${row},${col}`;
  }

  isEmptyForDrop(row: number, col: number): boolean {
    const key = `${row},${col}`;
    return this.state.currentGrid[row * this.state.width + col] === '_'
      && !this.placedLetters.has(key);
  }

}
