import { highlightPython } from '../coding/python-editor/python-highlight';

const JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'if', 'implements', 'import',
  'instanceof', 'int', 'interface', 'long', 'new', 'package', 'private', 'protected', 'public', 'return', 'short',
  'static', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'try', 'var', 'void', 'volatile', 'while',
  'record', 'sealed', 'permits', 'yield'
]);
const JAVA_CONSTANTS = new Set(['true', 'false', 'null']);

const JAVA_TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("""[\s\S]*?(?:"""|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)|(\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?[lLfFdD]?\b)|(@[A-Za-z_]\w*)|(\b[A-Za-z_]\w*\b)|([+\-*/%=<>!&|^~?:]+)|([\s\S])/g;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightJava(code: string): string {
  let out = '';
  let prevWord = '';
  JAVA_TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = JAVA_TOKEN.exec(code)) !== null) {
    const [text, comment, str, num, annotation, ident, op] = m;
    if (comment) out += `<span class="tk-comment">${esc(text)}</span>`;
    else if (str) out += `<span class="tk-string">${esc(text)}</span>`;
    else if (num) out += `<span class="tk-number">${esc(text)}</span>`;
    else if (annotation) out += `<span class="tk-def">${esc(text)}</span>`;
    else if (ident) {
      if (JAVA_KEYWORDS.has(text)) out += `<span class="tk-keyword">${esc(text)}</span>`;
      else if (JAVA_CONSTANTS.has(text)) out += `<span class="tk-number">${esc(text)}</span>`;
      else if (prevWord === 'class' || prevWord === 'interface' || prevWord === 'enum' || prevWord === 'record') out += `<span class="tk-def">${esc(text)}</span>`;
      else if (/^[A-Z]/.test(text)) out += `<span class="tk-builtin">${esc(text)}</span>`;
      else out += esc(text);
      prevWord = text;
      continue;
    } else if (op) out += `<span class="tk-op">${esc(text)}</span>`;
    else out += esc(text);
    if (!/^\s+$/.test(text)) prevWord = '';
  }
  return out;
}

/** Color presets available in ```lang fences. Unknown languages render as plain code. */
export function highlightCode(code: string, lang: string): string {
  switch (lang.trim().toLowerCase()) {
    case 'java': return highlightJava(code);
    case 'python':
    case 'py': return highlightPython(code);
    default: return esc(code);
  }
}
