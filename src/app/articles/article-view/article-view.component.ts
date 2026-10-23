import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Article, ArticleService } from '../../service/article.service';

@Component({
  selector: 'app-article-view',
  templateUrl: './article-view.component.html',
  styleUrls: ['./article-view.component.css']
})
export class ArticleViewComponent implements OnInit {

  article: Article | null = null;
  loading = true;
  error = false;

  constructor(private route: ActivatedRoute, private router: Router, private articleService: ArticleService, private host: ElementRef<HTMLElement>) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id')!;
      this.loading = true;
      this.error = false;
      this.articleService.get(id).subscribe({
        next: a => { this.article = a; this.loading = false; setTimeout(() => this.scrollToSection(), 50); },
        error: () => { this.error = true; this.loading = false; }
      });
    });
  }

  private scrollToSection() {
    const section = this.route.snapshot.queryParamMap.get('section');
    if (!section) return;
    const target = ArticleService.findHeading(this.host.nativeElement, section);
    if (target) {
      target.scrollIntoView({ block: 'start' });
      target.classList.add('section-hit');
    }
  }

  edit() {
    if (this.article) this.router.navigate(['/admin/articles', this.article.id, 'edit']);
  }

  practice() {
    if (this.article?.relatedTestId) this.router.navigate(['/tests', this.article.relatedTestId]);
  }

  /** Rough reading time at ~200 words a minute, computed from the visible text. */
  get readingMinutes(): number {
    const text = (this.article?.content ?? '').replace(/<[^>]*>/g, ' ');
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

}
