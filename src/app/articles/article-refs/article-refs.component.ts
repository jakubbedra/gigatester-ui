import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import { Article, ArticleService, ArticleSummary } from '../../service/article.service';
import { ArticleReferenceDto } from '../../models/models.d';

/** Chips linking a question to articles; clicking one opens the article (scrolled to its section) in a modal. */
@Component({
  selector: 'app-article-refs',
  templateUrl: './article-refs.component.html',
  styleUrls: ['./article-refs.component.css']
})
export class ArticleRefsComponent implements OnChanges {

  @Input() refs: ArticleReferenceDto[] | null | undefined = [];

  names = new Map<string, string>();
  open: ArticleReferenceDto | null = null;
  article: Article | null = null;
  loading = false;
  error = false;

  @ViewChild('body') body?: ElementRef<HTMLElement>;

  constructor(private articleService: ArticleService) {}

  ngOnChanges() {
    if ((this.refs ?? []).length === 0) return;
    this.articleService.listReadable().subscribe({
      next: list => list.forEach((a: ArticleSummary) => this.names.set(a.id, a.name)),
      error: () => {}
    });
  }

  nameOf(ref: ArticleReferenceDto): string {
    return this.names.get(ref.articleId) ?? '…';
  }

  show(ref: ArticleReferenceDto) {
    this.open = ref;
    this.article = null;
    this.error = false;
    this.loading = true;
    this.articleService.get(ref.articleId).subscribe({
      next: a => {
        this.article = a;
        this.loading = false;
        setTimeout(() => this.scrollToSection(), 50);
      },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  close() {
    this.open = null;
    this.article = null;
  }

  private scrollToSection() {
    const root = this.body?.nativeElement;
    const section = this.open?.section;
    if (!root || !section) return;
    const target = ArticleService.findHeading(root, section);
    if (target) {
      target.scrollIntoView({ block: 'start' });
      target.classList.add('section-hit');
    }
  }
}
