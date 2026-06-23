import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CrosswordResponse } from '../../models/models.d';
import { CrosswordService } from '../../service/crossword.service';
import { CrosswordStateService } from '../../service/crossword-state.service';

@Component({
  selector: 'app-crossword-view',
  templateUrl: './crossword-view.component.html',
  styleUrls: ['./crossword-view.component.css']
})
export class CrosswordViewComponent implements OnInit {

  crosswordId!: string;
  crossword!: CrosswordResponse;
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private crosswordService: CrosswordService,
    private crosswordStateService: CrosswordStateService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.crosswordId = params.get('id')!;
      this.crosswordService.getCrossword(this.crosswordId).subscribe(crossword => {
        this.crossword = crossword;
        this.form = this.fb.group({
          numberOfWords: [
            crossword.terms.length,
            [Validators.required, Validators.min(1), Validators.max(crossword.terms.length)]
          ]
        });
      });
    });
  }

  get termCount(): number {
    return this.crossword?.terms?.length ?? 0;
  }

  submit() {
    if (this.form.invalid) return;
    this.crosswordStateService.createCrosswordState({
      crosswordId: this.crosswordId,
      numberOfWords: Number(this.form.value.numberOfWords)
    }).subscribe({
      next: (state) => this.router.navigate(['/crosswords/states', state.id], { queryParams: { cid: this.crosswordId } }),
      error: (err) => console.error(err)
    });
  }

}
