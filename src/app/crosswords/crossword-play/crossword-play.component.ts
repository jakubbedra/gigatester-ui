import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragEnd, CdkDragMove, CdkDragStart, DragRef, Point } from '@angular/cdk/drag-drop';
import { CrosswordStateClueResponse, CrosswordStateResponse } from '../../models/models.d';
import { CrosswordStateService } from '../../service/crossword-state.service';
import { CrosswordStateUpdateRequest } from '../../models/models.d';
import { StreakService } from '../../service/streak.service';
import { ToastService } from '../../service/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { CrosswordSoundService } from '../../service/crossword-sound.service';
import { SidebarRefreshService } from '../../service/sidebar-refresh.service';

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
  /** Only true while the in-progress drag was started by touch — lets a mouse drag stay 1:1 with the cursor. */
  isTouchDrag = false;
  /**
   * On touch, the tile is rendered this many px above the finger while dragging so it
   * doesn't sit under the fingertip, blocking the view of the cell it's about to land on.
   */
  private readonly touchDragLiftPx = 56;
  cellSize = 38;
  mobileCellSize = 32;
  isSubmitting = false;

  flashCorrect = new Set<string>();
  flashWrong = new Set<string>();
  flashBot = new Set<string>();
  flashDelay = new Map<string, number>();
  wordToasts: { word: string; points: number }[] = [];

  // ── Word Duel mode ──
  wordGuess = '';
  guessResult: { correct: boolean; word: string; points: number } | null = null;

  showWinner = false;
  winner: 'human' | 'bot' | 'tie' | null = null;

  get isComplete(): boolean {
    return !!this.state && !this.state.currentGrid.includes('_');
  }

  get isWordsMode(): boolean {
    return this.state?.mode === 'WORDS';
  }

  @ViewChild('gridScroll') gridScrollEl!: ElementRef<HTMLElement>;
  private resizeObserver!: ResizeObserver;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private crosswordStateService: CrosswordStateService,
    private streakService: StreakService,
    private toastService: ToastService,
    private translate: TranslateService,
    public sound: CrosswordSoundService,
    private sidebarRefreshService: SidebarRefreshService
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
    this.wordGuess = '';
    this.guessResult = null;
    this.highlightedCells.clear();
    let r = entry.clue.row, c = entry.clue.column;
    for (let i = 0; i < entry.length; i++) {
      this.highlightedCells.add(`${r},${c}`);
      if (entry.clue.direction === 'ACROSS') c++; else r++;
    }
  }

  submitWord() {
    if (this.isSubmitting || !this.selectedClue) return;
    const word = this.wordGuess.trim();
    if (!word || this.selectedClue.clue.solved) return;
    const termId = this.selectedClue.clue.id;

    this.isSubmitting = true;
    this.guessResult = null;
    this.crosswordStateService.submitWord(this.state.id, { termId, word }).subscribe({
      next: (updated) => {
        this.isSubmitting = false;
        this.state = updated;
        this.buildClues();
        this.applyWordFlash(updated, word);
        this.wordGuess = '';
        this.selectedClue = null;
        this.highlightedCells.clear();
        setTimeout(() => this.updateCellSize(), 0);
      },
      error: () => { this.isSubmitting = false; }
    });
  }

  private applyWordFlash(updated: CrosswordStateResponse, fallbackWord: string) {
    const turn = updated.lastWordTurn;
    if (!turn) return;

    this.guessResult = {
      correct: turn.humanCorrect,
      word: turn.humanWord ?? fallbackWord,
      points: turn.humanPoints
    };

    const toasts: { word: string; points: number }[] = [];
    if (turn.humanCorrect) {
      this.sound.playWordComplete();
      toasts.push({ word: this.guessResult.word, points: turn.humanPoints });
    }
    if (turn.botCorrect && turn.botWord) {
      toasts.push({ word: `🤖 ${turn.botWord}`, points: turn.botPoints });
    } else if (turn.botAttempted) {
      toasts.push({ word: `🤖 ${this.translate.instant('CROSSWORD_PLAY.BOT_MISSED')}`, points: 0 });
    }
    if (toasts.length > 0) {
      this.wordToasts = toasts;
      setTimeout(() => { this.wordToasts = []; }, 2800);
    }
    setTimeout(() => { this.guessResult = null; }, 4000);

    if (this.isComplete) {
      setTimeout(() => {
        const h = this.humanPlayer?.points ?? 0;
        const b = this.botPlayer?.points ?? 0;
        this.winner = h > b ? 'human' : b > h ? 'bot' : 'tie';
        setTimeout(() => {
          this.showWinner = true;
          if (this.winner === 'human') this.sound.playWin();
          else if (this.winner === 'bot') this.sound.playLose();
          else this.sound.playWordComplete();
        }, 1000);
        this.streakService.getStreak().subscribe(s => {
          this.sidebarRefreshService.notify();
          if (this.streakService.wasJustBumpedToday(s)) {
            const label = this.translate.instant('SIDEBAR.STREAK');
            this.toastService.show({ icon: '🔥', message: `${s.currentStreak} ${label}` });
          }
        });
      }, 1500);
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

  onDragStarted(event: CdkDragStart) {
    this.isDragging = true;
    this.hoveredCell = null;
    this.isTouchDrag = typeof TouchEvent !== 'undefined' && event.event instanceof TouchEvent;
  }

  /** Renders the dragged tile lifted above the finger on touch, so it doesn't hide the target cell underneath it. */
  dragConstrainPosition = (point: Point, _dragRef: DragRef, _dimensions: ClientRect, _pickupPositionInElement: Point): Point => {
    return this.isTouchDrag ? { x: point.x, y: point.y - this.touchDragLiftPx } : point;
  };

  private liftedY(y: number): number {
    return this.isTouchDrag ? y - this.touchDragLiftPx : y;
  }

  onDragMoved(event: CdkDragMove) {
    const target = document.elementFromPoint(event.pointerPosition.x, this.liftedY(event.pointerPosition.y)) as HTMLElement | null;
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
    // Capture before clearing — hoveredCell is the most reliable indicator on mobile
    // because elementFromPoint can be blocked by the CDK drag preview still in the DOM.
    const targetCell = this.hoveredCell;
    this.hoveredCell = null;

    const tryPlace = (row: number, col: number): boolean => {
      const key = `${row},${col}`;
      if (this.state.currentGrid[row * this.state.width + col] === '_' && !this.placedLetters.has(key)) {
        this.placedLetters.set(key, { letter, handIndex });
        this.placedCount++;
        this.handLetters = this.handLetters.map((l, i) => i === handIndex ? '' : l);
        return true;
      }
      return false;
    };

    // Primary path: use cell tracked during drag moves (works on both mouse and touch).
    if (targetCell) {
      const [row, col] = targetCell.split(',').map(Number);
      if (tryPlace(row, col)) {
        event.source._dragRef.reset();
        return;
      }
    }

    // Fallback: re-derive from the drop point coordinates (covers rapid drops where
    // onDragMoved didn't fire for the final frame).
    const el = event.source.element.nativeElement as HTMLElement;
    el.style.visibility = 'hidden';
    const target = document.elementFromPoint(event.dropPoint.x, this.liftedY(event.dropPoint.y)) as HTMLElement | null;
    el.style.visibility = '';

    const cellEl = target?.closest<HTMLElement>('[data-cell-row]');
    if (cellEl) {
      const row = parseInt(cellEl.dataset['cellRow']!);
      const col = parseInt(cellEl.dataset['cellCol']!);
      if (tryPlace(row, col)) {
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
        delays.set(key, humanIdx * 500);
        humanIdx++;
      }
      let botIdx = 0;
      for (const r of turn.botPlacements) {
        const key = `${r.row},${r.column}`;
        bot.add(key);
        delays.set(key, botIdx * 500);
        botIdx++;
      }
    }

    this.flashDelay = delays;
    this.flashCorrect = correct;
    this.flashWrong = wrong;

    // Schedule all letter sounds at once using the Web Audio API timeline
    if (turn?.humanResults?.length) {
      this.sound.playResultSequence(turn.humanResults, 0.5);
    }

    const humanCount = correct.size + wrong.size;
    const humanDuration = 2500 + Math.max(0, humanCount - 1) * 500;

    if (turn?.humanCompletedWords?.length) {
      setTimeout(() => {
        this.wordToasts = turn.humanCompletedWords.map(w => ({ word: w.word, points: w.points }));
        this.sound.playWordComplete();
        setTimeout(() => { this.wordToasts = []; }, 2500);
      }, humanDuration);
    }

    setTimeout(() => {
      this.flashCorrect = new Set();
      this.flashWrong = new Set();
      this.flashBot = bot;

      const botDuration = 3000 + (bot.size - 1) * 500;
      setTimeout(() => {
        this.flashBot = new Set();
        this.flashDelay = new Map();
        if (this.isComplete) {
          const h = this.humanPlayer?.points ?? 0;
          const b = this.botPlayer?.points ?? 0;
          this.winner = h > b ? 'human' : b > h ? 'bot' : 'tie';
          setTimeout(() => {
            this.showWinner = true;
            if (this.winner === 'human') this.sound.playWin();
            else if (this.winner === 'bot') this.sound.playLose();
            else this.sound.playWordComplete();
          }, 1000);
          this.streakService.getStreak().subscribe(s => {
            this.sidebarRefreshService.notify();
            if (this.streakService.wasJustBumpedToday(s)) {
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
