import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ArticleService } from '../../service/article.service';
import { TestService } from '../../service/test.service';
import { TestsResponse } from '../../models/models.d';

@Component({
  selector: 'app-article-edit',
  templateUrl: './article-edit.component.html',
  styleUrls: ['./article-edit.component.css']
})
export class ArticleEditComponent implements OnInit {

  articleId!: string;
  loading = true;
  saving = false;
  saved = false;
  error: string | null = null;
  uploading = false;

  name = '';
  content = '';
  published = false;
  relatedTestId = '';
  tests: { id: string; name: string }[] = [];

  private quill: any = null;

  quillModules = {
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: () => this.pickImage()
      }
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private articleService: ArticleService,
    private testService: TestService
  ) {}

  ngOnInit() {
    this.articleId = this.route.snapshot.paramMap.get('id')!;
    this.testService.getTests().subscribe({
      next: (res: TestsResponse) => this.tests = [...res.tests].sort((a, b) => a.name.localeCompare(b.name)),
      error: () => this.tests = []
    });
    this.articleService.get(this.articleId).subscribe({
      next: a => {
        this.name = a.name;
        this.content = a.content ?? '';
        this.published = a.published;
        this.relatedTestId = a.relatedTestId ?? '';
        this.loading = false;
      },
      error: () => { this.error = 'load'; this.loading = false; }
    });
  }

  touched() {
    this.saved = false;
  }

  onEditorCreated(quill: any) {
    this.quill = quill;
    // The rich-text box ignores an HTML value set before it existed, so an empty editor is filled in by hand.
    if (this.content && quill.getText().trim() === '') {
      quill.clipboard.dangerouslyPasteHTML(0, this.content, 'silent');
    }
  }

  /** Opens a file picker, uploads the image and inserts it where the cursor was. */
  private pickImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file || !this.quill) return;
      const range = this.quill.getSelection(true);
      this.uploading = true;
      this.articleService.uploadImage(this.articleId, file).subscribe({
        next: url => {
          this.uploading = false;
          this.quill.insertEmbed(range ? range.index : this.quill.getLength(), 'image', url, 'user');
        },
        error: err => {
          this.uploading = false;
          this.error = err?.error?.message || 'image';
        }
      });
    };
    input.click();
  }

  get canSave(): boolean {
    return !!this.name.trim() && !this.saving && !this.uploading;
  }

  save() {
    if (!this.canSave) return;
    this.saving = true;
    this.error = null;
    this.articleService.update(this.articleId, {
      name: this.name.trim(),
      content: this.content,
      published: this.published,
      relatedTestId: this.relatedTestId || null
    }).subscribe({
      next: () => { this.saving = false; this.saved = true; },
      error: err => { this.saving = false; this.error = err?.error?.message || 'save'; }
    });
  }

  back() {
    this.router.navigate(['/articles', this.articleId]);
  }

}
