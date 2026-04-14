# bluebel Studio

IDE oficial da Skylike, construída com Tauri + JavaScript puro.

## Funcionalidades

- Syntax highlighting via arquivos de definição `.yaml` ou `.xml`
- Suporte a múltiplas linguagens (JavaScript, Python, Rust, C, C++, Zig, Nim e mais)
- Autocomplete inteligente de palavras-chave e literais
- Execução de código integrada (F5)
- Detecção automática de linguagem por extensão de arquivo
- Painel de output para resultados de execução
- Atalhos de teclado:
  - `Ctrl+S` salvar
  - `Ctrl+O` abrir
  - `Ctrl+L` carregar linguagem
  - `Ctrl+T` inserir TODO
  - `F5` ou `Ctrl+R` executar código
  - `Tab` para indentar
  - Setas `↑/↓` navegar autocomplete
  - `Enter/Tab` aceitar sugestão
  - `Esc` fechar autocomplete
- Status bar com linha e coluna atual
- Interface leve e sem dependências de framework

## Linguagens Suportadas

### Interpretadas (execução direta):
- JavaScript (Node.js)
- Python

### Compiladas (compila e executa):
- Rust (rustc)
- C (gcc)
- C++ (g++)
- Zig (zig run)
- Nim (nim c -r)

## Requisitos

Para executar código, você precisa ter os compiladores/interpretadores instalados:
- Node.js para JavaScript
- Python 3 para Python
- rustc para Rust
- gcc para C
- g++ para C++
- zig para Zig
- nim para Nim

## Download

Baixe a versão mais recente para seu sistema:

- **Windows**: `.msi` ou `.exe`
- **macOS**: `.dmg` (Intel e Apple Silicon)
- **Linux**: Compile localmente (veja abaixo)

Acesse a [página de releases](../../releases) para baixar.

## Build Local (Linux)

### Requisitos:
- Node.js 20+
- Rust (rustup)
- pnpm

```bash
sudo apt-get install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
cd bluebelStudio
pnpm install
pnpm tauri build
```

O executável estará em `src-tauri/target/release/bluebel-studio`

## Build Automático (GitHub Actions)

Ao fazer push ou criar uma tag `v*`, o GitHub Actions automaticamente:
- Builda para Windows e macOS
- Cria instaladores para cada plataforma
- Publica os arquivos como artifacts
- Cria release automática (se for tag)

## Tecnologias

- [Tauri v2](https://tauri.app)
- JavaScript puro (sem frameworks)
- Rust
