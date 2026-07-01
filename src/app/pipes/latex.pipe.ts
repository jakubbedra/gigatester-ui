import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as katex from 'katex';

@Pipe({ name: 'latex' })
export class LatexPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';

    // Render display math ($$...$$) then inline math ($...$)
    const html = this.renderMath(value);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private renderMath(text: string): string {
    // Split on $$...$$ first (display), then $...$ (inline)
    const parts: string[] = [];
    let remaining = text;

    // Match $$...$$ or $...$ — display first to avoid double-match
    const regex = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(remaining)) !== null) {
      // Push plain text before this match (HTML-escaped)
      const before = remaining.slice(lastIndex, match.index);
      if (before) parts.push(this.escapeHtml(before));

      const displaySrc = match[1];
      const inlineSrc = match[2];

      try {
        if (displaySrc !== undefined) {
          parts.push(katex.renderToString(displaySrc, { displayMode: true, throwOnError: false }));
        } else {
          parts.push(katex.renderToString(inlineSrc, { displayMode: false, throwOnError: false }));
        }
      } catch {
        parts.push(this.escapeHtml(match[0]));
      }

      lastIndex = match.index + match[0].length;
    }

    // Remaining plain text
    const tail = remaining.slice(lastIndex);
    if (tail) parts.push(this.escapeHtml(tail));

    return parts.join('');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
