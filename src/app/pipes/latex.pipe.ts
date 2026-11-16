import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as katex from 'katex';
import { highlightCode } from './code-highlight';

@Pipe({ name: 'latex' })
export class LatexPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';

    // Fenced code blocks (three backticks, optional language: java / python) are pulled out first so
    // that $ signs and markup inside the code are never treated as math or HTML.
    const blocks: string[] = [];
    const withoutCode = value.replace(/```([A-Za-z]*)[ \t]*\r?\n?([\s\S]*?)```/g, (_m, lang: string, code: string) => {
      blocks.push(this.renderCode(lang, code));
      return `\u0000CODE${blocks.length - 1}\u0000`;
    });

    // Render display math ($...$) then inline math ($...$)
    const html = this.renderMath(withoutCode).replace(/\u0000CODE(\d+)\u0000/g, (_m, i: string) => blocks[+i]);
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
      // Push plain text before this match as-is (content may be HTML)
      const before = remaining.slice(lastIndex, match.index);
      if (before) parts.push(before);

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

    // Remaining plain text / HTML as-is
    const tail = remaining.slice(lastIndex);
    if (tail) parts.push(tail);

    return parts.join('');
  }

  private renderCode(lang: string, code: string): string {
    const clean = code.replace(/\n$/, '');
    const label = lang ? `<span class="code-lang">${this.escapeHtml(lang.toLowerCase())}</span>` : '';
    return `<pre class="code-snippet">${label}<code>${highlightCode(clean, lang)}</code></pre>`;
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
