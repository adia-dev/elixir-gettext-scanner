# Gettext Scanner

This vscode extension helps you scan your codebase for translatable strings, and generate the necessary gettext files.

## Features

- Scan your codebase for translatable strings
- Refreshes the scanned strings
- Copy the msgid to clipboard
- Displays the msgids in a tree view

## Requirements

- A workspace must be opened
- The extension must be enabled in the settings
- A valid scan path and po files path must be provided in the settings

## Usage

1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type `Gettext Scanner: Scan` and press enter to scan your codebase for translatable strings
3. Type `Gettext Scanner: Refresh` and press enter to refresh the scanned strings
4. Type `Gettext Scanner: Scan and Refresh` and press enter to scan and refresh the scanned strings
5. Right click on a msgid in the tree view and select `Copy msgid` to copy the msgid to clipboard

## Settings

- `gettext-scanner.scanPath`: The path to scan for translatable strings (required)
- `gettext-scanner.poFilesPath`: The path to the po files (required)
- `gettext-scanner.enabled`: Enable or disable the extension

## Known Issues

None

## Release Notes

### 0.0.1

- Initial release

### 0.0.2

- Fix bug where the extension would not scan the correct path

### 0.0.3

- Change the icon on the activity bar

### 0.0.4

- Add msgid to .pot file
- Add google translate functionality (still very much a work in progress)

### 0.0.5

- New decorator to highlight msgids on the active editor
- Scan the current file on save and refresh the decorator
