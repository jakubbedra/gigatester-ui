const KEYWORDS = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
  'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'try', 'while', 'with', 'yield', 'match', 'case'
]);
const CONSTANTS = new Set(['True', 'False', 'None']);
const BUILTINS = new Set([
  'abs', 'all', 'any', 'bin', 'bool', 'chr', 'dict', 'divmod', 'enumerate', 'filter', 'float', 'format', 'input',
  'int', 'isinstance', 'len', 'list', 'map', 'max', 'min', 'next', 'open', 'ord', 'pow', 'print', 'range',
  'reversed', 'round', 'set', 'sorted', 'str', 'sum', 'tuple', 'type', 'zip', 'self'
]);

const TOKEN = /(#[^\n]*)|("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$))|((?:[rRbBfFuU]{1,2})?(?:"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?))|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\b[A-Za-z_]\w*\b)|([+\-*/%=<>!&|^~]+)|([\s\S])/g;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Tiny dependency-free Python highlighter: returns HTML made of <span class="tk-*"> tokens. */
export function highlightPython(code: string): string {
  let out = '';
  let prevWord = '';
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(code)) !== null) {
    const [text, comment, triple, str, num, ident, op] = m;
    if (comment) out += `<span class="tk-comment">${esc(text)}</span>`;
    else if (triple || str) out += `<span class="tk-string">${esc(text)}</span>`;
    else if (num) out += `<span class="tk-number">${esc(text)}</span>`;
    else if (ident) {
      if (KEYWORDS.has(text)) out += `<span class="tk-keyword">${esc(text)}</span>`;
      else if (CONSTANTS.has(text)) out += `<span class="tk-number">${esc(text)}</span>`;
      else if (prevWord === 'def' || prevWord === 'class') out += `<span class="tk-def">${esc(text)}</span>`;
      else if (BUILTINS.has(text)) out += `<span class="tk-builtin">${esc(text)}</span>`;
      else out += esc(text);
      prevWord = text;
      continue;
    } else if (op) out += `<span class="tk-op">${esc(text)}</span>`;
    else out += esc(text);
    if (!/^\s+$/.test(text)) prevWord = '';
  }
  return out;
}
