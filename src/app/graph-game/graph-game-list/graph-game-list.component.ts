import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GraphService, GraphSummary } from '../../service/graph.service';
import { GraphDifficulty, GraphPlayMode, GraphSessionService } from '../../service/graph-session.service';

@Component({
  selector: 'app-graph-game-list',
  templateUrl: './graph-game-list.component.html',
  styleUrls: ['./graph-game-list.component.css']
})
export class GraphGameListComponent implements OnInit {

  graphs: GraphSummary[] = [];
  loading = true;
  selectedGraphId: string | null = null;
  difficulty: GraphDifficulty = 'NORMAL';
  mode: GraphPlayMode = 'TYPING';
  starting = false;

  readonly modes: { value: GraphPlayMode; label: string; hint: string }[] = [
    { value: 'TYPING', label: 'GRAPH_GAME.MODE_TYPING', hint: 'GRAPH_GAME.MODE_TYPING_HINT' },
    { value: 'DRAG_DROP', label: 'GRAPH_GAME.MODE_DRAG', hint: 'GRAPH_GAME.MODE_DRAG_HINT' },
  ];

  readonly difficulties: { value: GraphDifficulty; label: string; hint: string }[] = [
    { value: 'EASY', label: 'GRAPH_GAME.DIFF_EASY', hint: 'GRAPH_GAME.DIFF_EASY_HINT' },
    { value: 'NORMAL', label: 'GRAPH_GAME.DIFF_NORMAL', hint: 'GRAPH_GAME.DIFF_NORMAL_HINT' },
    { value: 'HARD', label: 'GRAPH_GAME.DIFF_HARD', hint: 'GRAPH_GAME.DIFF_HARD_HINT' },
    { value: 'IMPOSSIBLE', label: 'GRAPH_GAME.DIFF_IMPOSSIBLE', hint: 'GRAPH_GAME.DIFF_IMPOSSIBLE_HINT' },
  ];

  constructor(
    private graphService: GraphService,
    private graphSessionService: GraphSessionService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const preselected = this.route.snapshot.queryParamMap.get('graphId');
    this.graphService.getPlayableGraphs().subscribe({
      next: list => {
        this.graphs = list;
        this.loading = false;
        if (preselected && list.some(g => g.id === preselected)) this.selectedGraphId = preselected;
      },
      error: () => { this.loading = false; }
    });
  }

  get currentModeHint(): string {
    return this.modes.find(m => m.value === this.mode)!.hint;
  }

  get currentDifficultyHint(): string {
    return this.difficulties.find(d => d.value === this.difficulty)!.hint;
  }

  selectGraph(id: string) {
    this.selectedGraphId = id;
  }

  startGame() {
    if (!this.selectedGraphId || this.starting) return;
    this.starting = true;
    this.graphSessionService.startSession(this.selectedGraphId, this.difficulty, this.mode).subscribe({
      next: session => this.router.navigate(['/graphs/sessions', session.id]),
      error: () => { this.starting = false; }
    });
  }

}
