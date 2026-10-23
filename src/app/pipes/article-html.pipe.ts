import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as katex from 'katex';

/**
 * Renders an article's HTML: first sanitized by Angular (scripts, event handlers and so on are removed),
 * then LaTeX written as $...$ or $$...$$ in the text is typeset with KaTeX. Only text between tags is
 * touched, so attributes and markup are never mangled.
 */
@Pipe({ name: 'articleHtml' })
export class ArticleHtmlPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';
    const clean = this.sanitizer.sanitize(SecurityContext.HTML, value) ?? '';
    const withMath = clean.replace(/(<[^>]*>)|([^<]+)/g, (_m, tag: string, text: string) =>
      tag ? tag : this.renderMath(text));
    return this.sanitizer.bypassSecurityTrustHtml(withMath);
  }

  private renderMath(text: string): string {
    return text.replace(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g, (_m, display: string, inline: string) => {
      const src = this.decode(display ?? inline);
      try {
        return katex.renderToString(src, { displayMode: display !== undefined, throwOnError: false });
      } catch {
        return _m;
      }
    });
  }

  /** The sanitizer escapes &, < and > inside text; LaTeX needs the real characters back. */
  private decode(s: string): string {
    return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }
}
