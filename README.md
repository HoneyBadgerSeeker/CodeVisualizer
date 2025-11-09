# CodeVisualizer

**Real-time interactive flowcharts for your code with AI-powered insights**

CodeVisualizer is a powerful VS Code extension that transforms your source code into beautiful, interactive flowcharts. It supports multiple programming languages and provides AI-powered label generation.

![CodeVisualizer](https://img.shields.io/badge/version-1.0.0-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-1.22.0+-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

## Features

### Code Flowchart Generation
- **Multi-language Support**: Python, TypeScript/JavaScript, Java, C++, C, Rust, Go
- **Interactive Visualization**: Click nodes to navigate to code, zoom and pan
- **Multiple Views**: Sidebar view and detachable panel windows
- **Semantic Analysis**: Understand control flow, loops, exceptions, and async operations

### Customization
- **9 Beautiful Themes**: Monokai, Catppuccin, GitHub, Solarized, One Dark Pro, Dracula, Material Theme, Nord, Tokyo Night
- **Complexity Analysis**: Visual indicators for cyclomatic complexity
- **Export Options**: Export flowcharts as PNG, SVG, or PDF (coming soon)

### AI-Powered Features
- **Smart Labels**: AI-generated human-friendly node labels
- **Multiple Providers**: OpenAI, Gemini, Groq, Ollama (local), Anthropic
- **Intelligent Caching**: Efficient caching to minimize API calls
- **Customizable Style**: Concise, explanatory, or technical label styles
- **Multi-language Support**: Generate labels in your preferred language

### Developer Experience
- **Auto-refresh**: Automatically update flowcharts on code changes
- **Performance Optimized**: Efficient parsing with Tree-sitter (WASM)
- **Keyboard Shortcuts**: Quick access to all features

## How It Works

### Code Analysis Pipeline

1. **Parsing**: Uses Tree-sitter parsers (compiled to WASM) to parse source code into Abstract Syntax Trees (AST)
2. **Analysis**: Traverses the AST to identify:
   - Control flow structures (if/else, switch, loops)
   - Function boundaries
   - Exception handling
   - Async operations
   - Data operations (assignments, function calls)
3. **IR Generation**: Converts AST into an Intermediate Representation (IR) with nodes and edges
4. **Visualization**: Generates Mermaid diagram code from IR
5. **Rendering**: Renders interactive flowchart using Mermaid.js in webview

### AI Label Generation

1. **Extraction**: Extracts node labels from generated Mermaid code
2. **Caching**: Checks cache for previously generated labels
3. **Translation**: Sends uncached labels to selected LLM provider
4. **Replacement**: Replaces technical labels with human-friendly descriptions
5. **Storage**: Caches results for future use

## Privacy & Security

### Data Handling

**Code Analysis:**
- All code parsing happens **locally** on your machine
- No code is sent to external servers for flowchart generation
- AST parsing uses local Tree-sitter WASM parsers
- Your source code never leaves your computer

**AI Features (Optional):**
- When AI labels are enabled, **only node labels** (not full code) are sent to LLM providers
- API keys are stored securely using VS Code's Secret Storage API
- Caching minimizes API calls and reduces data transmission
- You can use local models (Ollama) for complete privacy
- All AI features are **opt-in** and disabled by default

### What Data is Collected?

**None.** CodeVisualizer does not collect, store, or transmit:
- ❌ Your source code
- ❌ File contents
- ❌ Personal information
- ❌ Usage statistics
- ❌ Telemetry data

**Exception:** Only when AI labels are explicitly enabled, minimal label text is sent to your chosen LLM provider (OpenAI, Gemini, etc.) for translation. This is completely optional and can be disabled at any time.

### API Keys

- API keys are stored using VS Code's secure Secret Storage
- Keys are encrypted and stored locally
- Never transmitted except to the selected LLM provider when making API calls
- You can clear stored keys anytime via settings

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "CodeVisualizer"
4. Click Install

### From Source

```bash
git clone https://github.com/DucPhamNgoc08/CodeVisualizer.git
cd CodeVisualizer
npm install
npm run compile
```

Then press F5 in VS Code to run the extension in a new window.

## Usage

### Generating Flowcharts

1. **Open a file** in your editor
2. **Select code** (optional - if not selected, analyzes entire file)
3. **Right-click** → "CodeVisualizer: Generate Flowchart"
   - Or use Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
   - Or click the flowchart icon in the sidebar

### Viewing Flowcharts

- **Sidebar View**: Automatically appears in the CodeVisualizer sidebar
- **Panel View**: Right-click → "Open Flowchart in New Window"
- **Multiple Views**: Open flowcharts in different editor columns

### AI Labels (Optional)

1. Command Palette → "CodeVisualizer: Enable AI Labels"
2. Select your preferred LLM provider
3. Enter API key (or use Ollama for local processing)
4. Choose model and style preferences
5. Flowcharts will automatically use AI-generated labels

## Configuration

### Theme Selection

```json
{
  "codevisualizer.theme": "monokai"  // Options: monokai, catppuccin, github, solarized, one-dark-pro, dracula, material-theme, nord, tokyo-night
}
```

### Auto-refresh

```json
{
  "codevisualizer.autoRefresh": true,  // Automatically update on code changes
  "codevisualizer.autoGenerate": false  // Auto-generate on file open
}
```

### AI Settings

```json
{
  "codevisualizer.llm.enabled": false,
  "codevisualizer.llm.provider": "openai",
  "codevisualizer.llm.model": "gpt-4o-mini",
  "codevisualizer.llm.style": "concise",
  "codevisualizer.llm.language": "en"
}
```

## Supported Languages

| Language | Status | Features |
|----------|--------|----------|
| Python | Full Support | Functions, classes, loops, exceptions, async |
| TypeScript/JavaScript | Full Support | Functions, classes, loops, promises, async/await |
| Java | Full Support | Methods, classes, loops, exceptions |
| C++ | Full Support | Functions, classes, loops, exceptions |
| C | Full Support | Functions, loops, conditionals |
| Rust | Full Support | Functions, match, loops, error handling |
| Go | Full Support | Functions, goroutines, error handling |


## Known Issues

- Export functionality is currently in development
- Large files (>10,000 lines) may take longer to parse

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **Tree-sitter**: For powerful AST parsing
- **Mermaid.js**: For beautiful diagram rendering

## Support

- **Issues**: [GitHub Issues](https://github.com/DucPhamNgoc08/CodeVisualizer/issues)
- **Repository**: [GitHub](https://github.com/DucPhamNgoc08/CodeVisualizer)

---

**Made with ❤️ by Duc Pham Ngoc**
