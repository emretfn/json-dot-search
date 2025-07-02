# JSON Dot Search

A VSCode extension that provides enhanced JSON search functionality using dot notation.

## Features

- **Dot Notation Search**: Search for nested JSON properties using dot notation (e.g., `foo.bar`)
- **Smart Navigation**: Automatically navigate to found properties in your JSON files
- **Multiple Results**: Handle multiple matches with a quick pick menu
- **Context-Aware**: Only activates for JSON and JSONC files

## Usage

### Method 1: Command Palette

1. Open a JSON file in VSCode
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open the command palette
3. Type "Search JSON with Dot Notation" and select the command
4. Enter your dot notation query (e.g., `foo.bar`)

### Method 2: Keyboard Shortcut

1. Open a JSON file in VSCode
2. Press `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac)
3. Enter your dot notation query

### Method 3: Context Menu

1. Right-click in a JSON file
2. Select "Search JSON with Dot Notation" from the context menu
3. Enter your dot notation query

## Examples

Given this JSON:

```json
{
  "user": {
    "profile": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "settings": {
      "theme": "dark"
    }
  },
  "config": {
    "debug": true
  }
}
```

You can search for:

- `user.profile.name` → finds "John Doe"
- `user.settings.theme` → finds "dark"
- `config.debug` → finds true
- `profile.email` → finds "john@example.com" (partial path matching)

## Installation

### From Source

1. Clone or download this repository
2. Open the folder in VSCode
3. Run `pnpm install` to install dependencies
4. Run `pnpm run compile` to compile the TypeScript
5. Press `F5` to launch a new Extension Development Host window
6. Test the extension in the new window

### Building VSIX Package

1. Install `vsce`: `npm install -g vsce`
2. Run `vsce package` to create a `.vsix` file
3. Install the extension using `code --install-extension json-dot-search-0.0.1.vsix`

## Requirements

- VSCode 1.74.0 or higher

## Known Issues

- The extension currently uses a simple heuristic for path matching that may occasionally produce false positives in very complex JSON structures
- Only works with valid JSON files (syntax errors will prevent searching)

## Release Notes

### 0.0.1

- Initial release
- Basic dot notation search functionality
- Support for JSON and JSONC files
- Multiple result handling with quick pick menu
