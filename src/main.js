const { save, open } = window.__TAURI__.dialog;
const { writeTextFile, readTextFile } = window.__TAURI__.fs;
const { invoke } = window.__TAURI__.core;

const editor = document.getElementById("editor");
const highlightLayer = document.getElementById("highlight-layer");
const langName = document.getElementById("lang-name");
const statusPos = document.getElementById("status-pos");
const btnLoadLang = document.getElementById("btn-load-lang");
const btnRun = document.getElementById("btn-run");
const autocompleteBox = document.getElementById("autocomplete-box");
const outputPanel = document.getElementById("output-panel");
const outputContent = document.getElementById("output-content");
const btnCloseOutput = document.getElementById("btn-close-output");
const btnClearOutput = document.getElementById("btn-clear-output");
const terminalInput = document.getElementById("terminal-input");

let langRules = null;
let autocompleteList = [];
let selectedIndex = -1;
let currentFilePath = null;
let autoScroll = true;
let undoStack = [];
let redoStack = [];
let lastValue = '';

// ── Parsers de linguagem ─────────────────────────────────────────────────────

function parseLangXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const lang = doc.querySelector("language");
  if (!lang) return null;

  const get = (sel) => doc.querySelector(sel)?.textContent?.trim() ?? "";
  const split = (str) => str ? str.split(",").map(s => s.trim()).filter(Boolean) : [];

  return {
    name: lang.getAttribute("name") ?? "?",
    keywords: split(get("keywords")),
    literals: split(get("literals")),
    commentLine: doc.querySelector("comment")?.getAttribute("line") ?? null,
    commentBlockStart: doc.querySelector("comment")?.getAttribute("block-start") ?? null,
    commentBlockEnd: doc.querySelector("comment")?.getAttribute("block-end") ?? null,
    stringChars: (get("string") ? doc.querySelector("string")?.getAttribute("chars")?.split(" ") ?? [] : []),
    colors: {
      keyword: get("colors > keyword") || "#cc99cd",
      literal: get("colors > literal") || "#f08d49",
      string:  get("colors > string")  || "#7ec699",
      comment: get("colors > comment") || "#999999",
      number:  get("colors > number")  || "#f08d49",
    },
  };
}

function parseLangYaml(yamlText) {
  try {
    const data = parseSimpleYaml(yamlText);
    
    return {
      name: data.name || "?",
      keywords: data.keywords || [],
      literals: data.literals || [],
      commentLine: data.comment?.line || null,
      commentBlockStart: data.comment?.blockStart || null,
      commentBlockEnd: data.comment?.blockEnd || null,
      stringChars: data.string?.chars || [],
      colors: {
        keyword: data.colors?.keyword || "#cc99cd",
        literal: data.colors?.literal || "#f08d49",
        string: data.colors?.string || "#7ec699",
        comment: data.colors?.comment || "#999999",
        number: data.colors?.number || "#f08d49",
      },
    };
  } catch (e) {
    console.error("Erro ao parsear YAML:", e);
    return null;
  }
}

// Parser YAML simples (sem dependências)
function parseSimpleYaml(text) {
  const lines = text.split('\n');
  const result = {};
  let currentKey = null;
  let currentArray = null;
  let currentObject = null;
  let indent = 0;

  for (let line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const lineIndent = line.search(/\S/);
    const trimmed = line.trim();

    // Array item
    if (trimmed.startsWith('- ')) {
      const value = trimmed.slice(2).trim();
      if (currentArray) {
        currentArray.push(value.replace(/^["']|["']$/g, ''));
      }
      continue;
    }

    // Key-value
    if (trimmed.includes(':')) {
      const [key, ...valueParts] = trimmed.split(':');
      const value = valueParts.join(':').trim();

      if (lineIndent === 0) {
        // Top level
        currentKey = key.trim();
        if (value) {
          result[currentKey] = value.replace(/^["']|["']$/g, '');
          currentArray = null;
          currentObject = null;
        } else {
          // Check next line to determine type
          currentArray = [];
          currentObject = {};
          result[currentKey] = currentArray;
        }
      } else if (lineIndent === 2 && currentKey) {
        // Second level
        const subKey = key.trim();
        if (value) {
          if (!result[currentKey] || Array.isArray(result[currentKey])) {
            result[currentKey] = {};
            currentObject = result[currentKey];
            currentArray = null;
          }
          currentObject[subKey] = value.replace(/^["']|["']$/g, '');
        } else {
          if (!result[currentKey] || Array.isArray(result[currentKey])) {
            result[currentKey] = {};
            currentObject = result[currentKey];
          }
          currentObject[subKey] = [];
          currentArray = currentObject[subKey];
        }
      }
    }
  }

  return result;
}

// ── Highlight engine ─────────────────────────────────────────────────────────

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function applyHighlight(code) {
  if (!langRules) {
    highlightLayer.textContent = code;
    return;
  }

  const { keywords, literals, commentLine, commentBlockStart, commentBlockEnd, stringChars, colors } = langRules;
  let result = "";
  let i = 0;

  while (i < code.length) {
    // bloco de comentário
    if (commentBlockStart && code.startsWith(commentBlockStart, i)) {
      const end = code.indexOf(commentBlockEnd, i + commentBlockStart.length);
      const slice = end === -1 ? code.slice(i) : code.slice(i, end + commentBlockEnd.length);
      result += `<span style="color:${colors.comment}">${escapeHtml(slice)}</span>`;
      i += slice.length;
      continue;
    }

    // comentário de linha
    if (commentLine && code.startsWith(commentLine, i)) {
      const end = code.indexOf("\n", i);
      const slice = end === -1 ? code.slice(i) : code.slice(i, end);
      result += `<span style="color:${colors.comment}">${escapeHtml(slice)}</span>`;
      i += slice.length;
      continue;
    }

    // strings
    const strChar = stringChars.find(c => code[i] === c);
    if (strChar) {
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === "\\" ) { j += 2; continue; }
        if (code[j] === strChar) { j++; break; }
        j++;
      }
      const slice = code.slice(i, j);
      result += `<span style="color:${colors.string}">${escapeHtml(slice)}</span>`;
      i = j;
      continue;
    }

    // números
    if (/[0-9]/.test(code[i]) && (i === 0 || /\W/.test(code[i - 1]))) {
      let j = i;
      while (j < code.length && /[0-9._xXa-fA-FbBoO]/.test(code[j])) j++;
      const slice = code.slice(i, j);
      result += `<span style="color:${colors.number}">${escapeHtml(slice)}</span>`;
      i = j;
      continue;
    }

    // palavras (keywords / literals / identifiers)
    if (/[a-zA-Z_$]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      if (keywords.includes(word)) {
        result += `<span style="color:${colors.keyword}">${escapeHtml(word)}</span>`;
      } else if (literals.includes(word)) {
        result += `<span style="color:${colors.literal}">${escapeHtml(word)}</span>`;
      } else {
        result += escapeHtml(word);
      }
      i = j;
      continue;
    }

    result += escapeHtml(code[i]);
    i++;
  }

  highlightLayer.innerHTML = result;
}

// ── Sync scroll ──────────────────────────────────────────────────────────────

editor.addEventListener("scroll", () => {
  highlightLayer.scrollTop = editor.scrollTop;
  highlightLayer.scrollLeft = editor.scrollLeft;
});

// ── Status bar ───────────────────────────────────────────────────────────────

editor.addEventListener("keyup", updateStatus);
editor.addEventListener("click", updateStatus);

function updateStatus() {
  const text = editor.value.slice(0, editor.selectionStart);
  const lines = text.split("\n");
  statusPos.textContent = `Ln ${lines.length}, Col ${lines[lines.length - 1].length + 1}`;
}

// ── Input → highlight ────────────────────────────────────────────────────────

editor.addEventListener("input", () => {
  applyHighlight(editor.value);
  updateAutocomplete();
  saveToUndoStack();
});

// ── Sistema de Undo/Redo ─────────────────────────────────────────────────────

function saveToUndoStack() {
  const currentValue = editor.value;
  
  // Só salva se mudou
  if (currentValue !== lastValue) {
    undoStack.push(lastValue);
    lastValue = currentValue;
    redoStack = []; // Limpa redo ao fazer nova ação
    
    // Limita o stack para não usar muita memória
    if (undoStack.length > 100) {
      undoStack.shift();
    }
  }
}

function undo() {
  if (undoStack.length === 0) return;
  
  redoStack.push(editor.value);
  const previousValue = undoStack.pop();
  editor.value = previousValue;
  lastValue = previousValue;
  applyHighlight(editor.value);
}

function redo() {
  if (redoStack.length === 0) return;
  
  undoStack.push(editor.value);
  const nextValue = redoStack.pop();
  editor.value = nextValue;
  lastValue = nextValue;
  applyHighlight(editor.value);
}

// Inicializa o undo stack
lastValue = editor.value;

// ── Autocomplete ─────────────────────────────────────────────────────────────

function getCurrentWord() {
  const text = editor.value;
  const pos = editor.selectionStart;
  let start = pos;
  
  while (start > 0 && /[a-zA-Z0-9_$]/.test(text[start - 1])) {
    start--;
  }
  
  return {
    word: text.slice(start, pos),
    start: start,
    end: pos
  };
}

function updateAutocomplete() {
  if (!langRules) {
    hideAutocomplete();
    return;
  }

  const { word, start } = getCurrentWord();
  
  if (word.length < 2) {
    hideAutocomplete();
    return;
  }

  const allSuggestions = [...langRules.keywords, ...langRules.literals];
  const matches = allSuggestions.filter(s => 
    s.toLowerCase().startsWith(word.toLowerCase()) && s !== word
  );

  if (matches.length === 0) {
    hideAutocomplete();
    return;
  }

  autocompleteList = matches;
  selectedIndex = 0;
  showAutocomplete(matches);
}

function showAutocomplete(matches) {
  autocompleteBox.innerHTML = matches.map((match, i) => 
    `<div class="autocomplete-item ${i === selectedIndex ? 'selected' : ''}" data-index="${i}">${match}</div>`
  ).join('');
  
  const coords = getCaretCoordinates();
  autocompleteBox.style.left = coords.x + 'px';
  autocompleteBox.style.top = (coords.y + 20) + 'px';
  autocompleteBox.style.display = 'block';
  
  autocompleteBox.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      insertAutocomplete(item.textContent);
    });
  });
}

function hideAutocomplete() {
  autocompleteBox.style.display = 'none';
  autocompleteList = [];
  selectedIndex = -1;
}

function insertAutocomplete(text) {
  const { start, end } = getCurrentWord();
  const value = editor.value;
  editor.value = value.slice(0, start) + text + value.slice(end);
  editor.selectionStart = editor.selectionEnd = start + text.length;
  applyHighlight(editor.value);
  hideAutocomplete();
  editor.focus();
}

function getCaretCoordinates() {
  const div = document.createElement('div');
  const style = window.getComputedStyle(editor);
  
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.font = style.font;
  div.style.padding = style.padding;
  div.style.border = style.border;
  div.style.width = editor.offsetWidth + 'px';
  
  const text = editor.value.slice(0, editor.selectionStart);
  div.textContent = text;
  
  const span = document.createElement('span');
  span.textContent = '|';
  div.appendChild(span);
  
  document.body.appendChild(div);
  
  const rect = editor.getBoundingClientRect();
  const spanRect = span.getBoundingClientRect();
  
  const x = spanRect.left - rect.left + editor.scrollLeft;
  const y = spanRect.top - rect.top + editor.scrollTop;
  
  document.body.removeChild(div);
  
  return { x, y };
}

// ── Carregar linguagem ───────────────────────────────────────────────────────

async function loadLanguage() {
  const filePath = await open({
    filters: [
      { name: "Language Definition", extensions: ["xml", "yaml", "yml"] }
    ],
  });
  if (!filePath) return;

  const fileText = await readTextFile(filePath);
  let rules = null;

  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    rules = parseLangYaml(fileText);
  } else {
    rules = parseLangXml(fileText);
  }

  if (!rules) return;

  langRules = rules;
  langName.textContent = rules.name;
  applyHighlight(editor.value);
}

btnLoadLang.addEventListener("click", loadLanguage);

// ── Atalhos de teclado ───────────────────────────────────────────────────────

document.addEventListener("keydown", async (e) => {
  // Navegação no autocomplete
  if (autocompleteBox.style.display === 'block') {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % autocompleteList.length;
      updateAutocompleteSelection();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = selectedIndex <= 0 ? autocompleteList.length - 1 : selectedIndex - 1;
      updateAutocompleteSelection();
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (selectedIndex >= 0 && autocompleteList[selectedIndex]) {
        insertAutocomplete(autocompleteList[selectedIndex]);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      hideAutocomplete();
      return;
    }
  }

  // Ctrl+S salvar
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    let filePath = currentFilePath;
    if (!filePath) {
      filePath = await save({
        filters: [{ name: "Text", extensions: ["txt", "js", "html", "css", "rs", "c", "cpp", "py", "zig", "nim", "md"] }],
      });
    }
    if (filePath) {
      currentFilePath = filePath;
      await writeTextFile(filePath, editor.value);
      autoDetectLanguage(filePath);
    }
  }

  // Ctrl+O abrir
  if (e.ctrlKey && e.key === "o") {
    e.preventDefault();
    const filePath = await open({
      filters: [{ name: "Text", extensions: ["txt", "js", "html", "css", "rs", "c", "cpp", "py", "zig", "nim", "md"] }],
    });
    if (filePath) {
      currentFilePath = filePath;
      editor.value = await readTextFile(filePath);
      applyHighlight(editor.value);
      autoDetectLanguage(filePath);
    }
  }

  // Ctrl+L carregar linguagem
  if (e.ctrlKey && e.key === "l") {
    e.preventDefault();
    await loadLanguage();
  }

  // Ctrl+T inserir TODO
  if (e.ctrlKey && e.key === "t") {
    e.preventDefault();
    const pos = editor.selectionStart;
    const text = editor.value;
    const todo = "// TODO: ";
    editor.value = text.slice(0, pos) + todo + text.slice(pos);
    editor.selectionStart = editor.selectionEnd = pos + todo.length;
    applyHighlight(editor.value);
  }

  // Tab → 4 espaços
  if (e.key === "Tab") {
    e.preventDefault();
    const pos = editor.selectionStart;
    const text = editor.value;
    const spaces = "    ";
    editor.value = text.slice(0, pos) + spaces + text.slice(pos);
    editor.selectionStart = editor.selectionEnd = pos + spaces.length;
    applyHighlight(editor.value);
  }

  // F5 ou Ctrl+R executar código
  if (e.key === "F5" || (e.ctrlKey && e.key === "r")) {
    e.preventDefault();
    await runCode();
  }

  // Ctrl+Z desfazer
  if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  }

  // Ctrl+Y ou Ctrl+Shift+Z refazer
  if ((e.ctrlKey && e.key === "y") || (e.ctrlKey && e.shiftKey && e.key === "z")) {
    e.preventDefault();
    redo();
  }
});

function updateAutocompleteSelection() {
  const items = autocompleteBox.querySelectorAll('.autocomplete-item');
  items.forEach((item, i) => {
    item.classList.toggle('selected', i === selectedIndex);
  });
  
  if (items[selectedIndex]) {
    items[selectedIndex].scrollIntoView({ block: 'nearest' });
  }
}

// Fechar autocomplete ao clicar fora
document.addEventListener('click', (e) => {
  if (!autocompleteBox.contains(e.target) && e.target !== editor) {
    hideAutocomplete();
  }
});

// ── Sistema de execução de código ────────────────────────────────────────────

async function runCode() {
  if (!currentFilePath) {
    showOutput("❌ Salve o arquivo antes de executar (Ctrl+S)");
    return;
  }

  // Salva antes de executar
  await writeTextFile(currentFilePath, editor.value);

  showOutput("⏳ Compilando e executando...\n");

  try {
    // Detecta linguagem pela extensão do arquivo, não pelo langRules
    const ext = currentFilePath.split('.').pop().toLowerCase();
    const langForExecution = detectLanguageForExecution(ext);
    
    if (!langForExecution) {
      showOutput(`❌ Não sei como executar arquivos .${ext}\nLinguagens suportadas: .js, .py, .rs, .c, .cpp, .zig, .nim, .html, .css`);
      return;
    }

    const result = await invoke('run_code', {
      language: langForExecution,
      filePath: currentFilePath
    });
    
    // Delay dramático para dar aquela sensação de IDE profissional 😎
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Remove códigos de escape ANSI
    const cleanResult = stripAnsiCodes(result || "(sem saída)");
    showOutput(cleanResult);
  } catch (error) {
    // Mesmo com erro, mantém o suspense
    await new Promise(resolve => setTimeout(resolve, 1000));
    const cleanError = stripAnsiCodes(String(error));
    showOutput(`❌ Erro:\n${cleanError}`);
  }
}

function detectLanguageForExecution(ext) {
  const execMap = {
    'js': 'JavaScript',
    'mjs': 'JavaScript',
    'cjs': 'JavaScript',
    'py': 'Python',
    'rs': 'Rust',
    'c': 'C',
    'h': 'C',
    'cpp': 'C++',
    'cc': 'C++',
    'cxx': 'C++',
    'hpp': 'C++',
    'zig': 'Zig',
    'nim': 'Nim',
    'html': 'HTML',
    'htm': 'HTML',
    'css': 'CSS',
  };
  
  return execMap[ext] || null;
}

function stripAnsiCodes(text) {
  // Remove códigos de escape ANSI (cores, posicionamento de cursor, etc)
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
             .replace(/\x1b\][0-9];.*?\x07/g, '')
             .replace(/\x1b\[[\?]?[0-9;]*[a-zA-Z]/g, '')
             .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
}

function showOutput(text) {
  outputContent.textContent = text;
  outputPanel.style.display = 'block';
  
  // Auto-scroll para o final se habilitado
  if (autoScroll) {
    setTimeout(() => {
      outputContent.scrollTop = outputContent.scrollHeight;
    }, 10);
  }
}

function hideOutput() {
  outputPanel.style.display = 'none';
}

function clearOutput() {
  outputContent.textContent = '';
}

btnRun.addEventListener('click', runCode);
btnCloseOutput.addEventListener('click', hideOutput);
btnClearOutput.addEventListener('click', clearOutput);

// ── Sistema de comandos do terminal ──────────────────────────────────────────

terminalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const command = terminalInput.value.trim();
    if (command) {
      executeTerminalCommand(command);
      terminalInput.value = '';
    }
  }
});

function executeTerminalCommand(cmd) {
  const parts = cmd.split(' ');
  const command = parts[0].toLowerCase();
  
  if (!command.startsWith('/')) {
    appendOutput(`$ ${cmd}\n❌ Comando desconhecido. Use /help para ver comandos disponíveis.\n`);
    return;
  }
  
  switch (command) {
    case '/help':
      appendOutput(`$ ${cmd}\n
Comandos disponíveis:
  /help          - Mostra esta ajuda
  /clear         - Limpa o terminal
  /rerun         - Executa o código novamente (F5)
  /autoscroll    - Ativa/desativa auto-scroll
  /close         - Fecha o terminal
  /info          - Mostra informações do arquivo atual
\n`);
      break;
      
    case '/clear':
      clearOutput();
      appendOutput(`$ ${cmd}\nTerminal limpo.\n`);
      break;
      
    case '/rerun':
      appendOutput(`$ ${cmd}\n`);
      runCode();
      break;
      
    case '/autoscroll':
      autoScroll = !autoScroll;
      appendOutput(`$ ${cmd}\nAuto-scroll ${autoScroll ? 'ativado ✓' : 'desativado ✗'}\n`);
      break;
      
    case '/close':
      hideOutput();
      break;
      
    case '/info':
      if (currentFilePath) {
        const ext = currentFilePath.split('.').pop();
        const lang = detectLanguageForExecution(ext) || 'Desconhecida';
        appendOutput(`$ ${cmd}\n
Arquivo: ${currentFilePath.split('/').pop()}
Caminho: ${currentFilePath}
Linguagem: ${lang}
Syntax: ${langRules ? langRules.name : 'Não carregada'}
\n`);
      } else {
        appendOutput(`$ ${cmd}\n❌ Nenhum arquivo aberto.\n`);
      }
      break;
      
    default:
      appendOutput(`$ ${cmd}\n❌ Comando '${command}' não encontrado. Use /help\n`);
  }
}

function appendOutput(text) {
  outputContent.textContent += text;
  if (autoScroll) {
    setTimeout(() => {
      outputContent.scrollTop = outputContent.scrollHeight;
    }, 10);
  }
}

// ── Auto-detecção de linguagem ───────────────────────────────────────────────

const langMap = {
  'js': 'javascript',
  'mjs': 'javascript',
  'cjs': 'javascript',
  'ts': 'javascript',
  'jsx': 'javascript',
  'tsx': 'javascript',
  'rs': 'rust',
  'c': 'c',
  'h': 'c',
  'cpp': 'cpp',
  'cc': 'cpp',
  'cxx': 'cpp',
  'hpp': 'cpp',
  'py': 'python',
  'zig': 'zig',
  'nim': 'nim',
  'css': 'css',
  'html': 'html',
  'htm': 'html',
  'md': 'markdown',
  'yaml': 'yaml',
  'yml': 'yaml',
};

async function autoDetectLanguage(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const langFile = langMap[ext];
  
  if (!langFile) return;

  try {
    // Tenta carregar do diretório langs/
    const langPath = `langs/${langFile}.yaml`;
    let langText;
    
    try {
      langText = await readTextFile(langPath);
      const rules = parseLangYaml(langText);
      if (rules) {
        langRules = rules;
        langName.textContent = rules.name;
        applyHighlight(editor.value);
        return;
      }
    } catch {
      // Tenta XML se YAML falhar
      const xmlPath = `langs/${langFile}.xml`;
      langText = await readTextFile(xmlPath);
      const rules = parseLangXml(langText);
      if (rules) {
        langRules = rules;
        langName.textContent = rules.name;
        applyHighlight(editor.value);
      }
    }
  } catch (e) {
    console.log("Não foi possível carregar linguagem automaticamente:", e);
  }
}
