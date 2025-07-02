import * as vscode from "vscode";

interface SearchResult {
  line: number;
  column: number;
  path: string;
  value: any;
  fullPath: string;
}

// Global variables to store decoration type and cursor listener
let highlightDecorationType: vscode.TextEditorDecorationType;
let cursorChangeDisposable: vscode.Disposable | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log("JSON Dot Search extension is now active!");

  // Create decoration type for highlighting found results
  highlightDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 255, 0, 0.3)", // Yellow highlight
    border: "1px solid rgba(255, 255, 0, 0.8)",
    borderRadius: "3px",
  });

  // Register the search command
  let disposable = vscode.commands.registerCommand(
    "jsonDotSearch.searchWithDotNotation",
    async () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
      }

      // Check if the current file is JSON
      const document = editor.document;
      if (document.languageId !== "json" && document.languageId !== "jsonc") {
        vscode.window.showErrorMessage("This command only works with JSON files");
        return;
      }

      // Get search query from user
      const searchQuery = await vscode.window.showInputBox({
        prompt: 'Enter dot notation path (e.g., "foo.bar")',
        placeHolder: "foo.bar",
      });

      if (!searchQuery) {
        return;
      }

      try {
        const text = document.getText();
        const results = searchJsonWithDotNotation(text, searchQuery);

        if (results.length === 0) {
          vscode.window.showInformationMessage(`No matches found for "${searchQuery}"`);
          return;
        }

        // Show results and navigate to first match
        await showSearchResults(editor, results, searchQuery);
      } catch (error) {
        vscode.window.showErrorMessage(`Error parsing JSON: ${error}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

function searchJsonWithDotNotation(jsonText: string, dotPath: string): SearchResult[] {
  const results: SearchResult[] = [];

  try {
    const jsonObj = JSON.parse(jsonText);
    const pathParts = dotPath.split(".");

    // Find all matches in the JSON structure
    findMatches(jsonObj, pathParts, [], results, jsonText);
  } catch (error) {
    throw new Error("Invalid JSON format");
  }

  return results;
}

function findMatches(
  obj: any,
  searchPath: string[],
  currentPath: string[],
  results: SearchResult[],
  originalText: string
): void {
  if (typeof obj !== "object" || obj === null) {
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    const newPath = [...currentPath, key];

    // Check if current path matches the search pattern
    if (pathMatches(newPath, searchPath)) {
      const position = findPositionInText(originalText, newPath);
      if (position) {
        results.push({
          line: position.line,
          column: position.column,
          path: key,
          value: value,
          fullPath: newPath.join("."),
        });
      }
    }

    // Continue searching in nested objects
    if (typeof value === "object" && value !== null) {
      findMatches(value, searchPath, newPath, results, originalText);
    }
  }
}

function pathMatches(currentPath: string[], searchPath: string[]): boolean {
  if (searchPath.length > currentPath.length) {
    return false;
  }

  // Check if the end of currentPath matches searchPath
  const startIndex = currentPath.length - searchPath.length;
  for (let i = 0; i < searchPath.length; i++) {
    if (currentPath[startIndex + i] !== searchPath[i]) {
      return false;
    }
  }

  return true;
}

function findPositionInText(text: string, path: string[]): { line: number; column: number } | null {
  const lines = text.split("\n");

  // Simple approach: find the line containing the last key in the path
  const targetKey = path[path.length - 1];
  const searchPattern = new RegExp(`"${escapeRegExp(targetKey)}"\\s*:`);

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(searchPattern);
    if (match) {
      // Verify this is the correct path by checking context
      if (isCorrectPath(lines, i, path)) {
        return {
          line: i,
          column: match.index || 0,
        };
      }
    }
  }

  return null;
}

function isCorrectPath(lines: string[], lineIndex: number, path: string[]): boolean {
  // Simple heuristic: check if parent keys appear in previous lines
  if (path.length <= 1) {
    return true;
  }

  const parentKeys = path.slice(0, -1);
  let foundParents = 0;

  // Look backwards from current line to find parent keys
  for (let i = lineIndex - 1; i >= 0 && foundParents < parentKeys.length; i--) {
    for (const parentKey of parentKeys) {
      if (lines[i].includes(`"${parentKey}"`)) {
        foundParents++;
        break;
      }
    }
  }

  return foundParents >= Math.min(parentKeys.length, 3); // Allow some flexibility
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function showSearchResults(
  editor: vscode.TextEditor,
  results: SearchResult[],
  query: string
): Promise<void> {
  // Clear any existing highlights
  editor.setDecorations(highlightDecorationType, []);

  if (results.length === 1) {
    // Navigate directly to the single result
    const result = results[0];
    highlightAndNavigateToResult(editor, result);
  } else {
    // Show quick pick for multiple results
    const items = results.map((result) => ({
      label: `Line ${result.line + 1}: ${result.fullPath}`,
      description: `${JSON.stringify(result.value)}`,
      result: result,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Found ${results.length} matches for "${query}". Select one to navigate:`,
    });

    if (selected) {
      highlightAndNavigateToResult(editor, selected.result);
    }
  }
}

function highlightAndNavigateToResult(editor: vscode.TextEditor, result: SearchResult): void {
  const line = editor.document.lineAt(result.line);
  const position = new vscode.Position(result.line, result.column);

  // Create decoration range for the entire line
  const decorationRange = new vscode.Range(
    new vscode.Position(result.line, 0),
    new vscode.Position(result.line, line.text.length)
  );

  // Clear any existing cursor change listener
  if (cursorChangeDisposable) {
    cursorChangeDisposable.dispose();
  }

  // Navigate to the position first
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);

  // Store the target position to compare against
  const targetPosition = position;

  // Apply highlight decoration after a small delay to ensure navigation is complete
  setTimeout(() => {
    editor.setDecorations(highlightDecorationType, [decorationRange]);

    // Listen for cursor changes to clear highlight
    cursorChangeDisposable = vscode.window.onDidChangeTextEditorSelection((event) => {
      if (event.textEditor === editor) {
        // Only clear highlight if cursor actually moved from the target position
        const currentPosition = event.selections[0].active;
        if (!currentPosition.isEqual(targetPosition)) {
          // Clear highlight when cursor moves away from target
          editor.setDecorations(highlightDecorationType, []);

          // Dispose the listener since we no longer need it
          if (cursorChangeDisposable) {
            cursorChangeDisposable.dispose();
            cursorChangeDisposable = undefined;
          }
        }
      }
    });
  }, 100); // Small delay to let navigation complete
}

export function deactivate() {
  // Clean up decoration type
  if (highlightDecorationType) {
    highlightDecorationType.dispose();
  }

  // Clean up cursor change listener
  if (cursorChangeDisposable) {
    cursorChangeDisposable.dispose();
  }
}
