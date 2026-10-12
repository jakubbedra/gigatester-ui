import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { highlightPython } from './python-highlight';

/** A code box with Python syntax colouring: a transparent textarea laid over a highlighted copy of the same text. */
@Component({
  selector: 'app-python-editor',
  templateUrl: './python-editor.component.html',
  styleUrls: ['./python-editor.component.css']
})
export class PythonEditorComponent {
  @Input() code = '';
  @Output() codeChange = new EventEmitter<string>();
  @Input() disabled = false;
  @Input() minHeight = 320;

  @ViewChild('area') area!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('layer') layer!: ElementRef<HTMLElement>;

  get html(): string {
    // A trailing newline is dropped by <pre> unless something follows it, which would shift the last line.
    return highlightPython(this.code) + '\n ';
  }

  onInput(value: string) {
    this.code = value;
    this.codeChange.emit(value);
  }

  syncScroll() {
    const a = this.area.nativeElement;
    const l = this.layer.nativeElement;
    l.scrollTop = a.scrollTop;
    l.scrollLeft = a.scrollLeft;
  }

  onTab(event: Event) {
    const e = event as KeyboardEvent;
    e.preventDefault();
    const el = this.area.nativeElement;
    const start = el.selectionStart, end = el.selectionEnd;
    this.onInput(this.code.substring(0, start) + '    ' + this.code.substring(end));
    setTimeout(() => el.setSelectionRange(start + 4, start + 4));
  }
}
