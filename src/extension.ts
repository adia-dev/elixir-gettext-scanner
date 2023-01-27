import path = require("path");
import * as vscode from "vscode";
import Scanner from "./scanner";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "gettext-scanner" is now active!'
  );

  const config = vscode.workspace.getConfiguration("gettext-scanner");

  if (config.get("enabled")) {
    if (config.get("scanOnStartup")) {
      let directory = config.get("scanPath") as string;
      console.log(directory);

      if (directory) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
          directory = path.join(workspaceFolder.uri.fsPath, directory);
          const scanner = new Scanner(directory);
          scanner.scan();
          vscode.window.showInformationMessage("Scan completed on startup");
        } else {
          vscode.window.showErrorMessage(
            "No workspace folder found, could not scan the project on startup"
          );
        }
      } else {
        vscode.window.showErrorMessage(
          "No directory specified in settings, could not scan the project on startup"
        );
      }
    }

    if (config.get("scanOnSave")) {
      vscode.workspace.onDidSaveTextDocument(async (document) => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
          const directory = path.join(
            workspaceFolder.uri.fsPath,
            config.get("scanPath") as string
          );
          const scanner = new Scanner(directory);
          await scanner.scan();
          vscode.window.showInformationMessage("Scan completed on save");
        } else {
          vscode.window.showErrorMessage(
            "No workspace folder found, could not scan the project on save"
          );
        }
      });
    }

    let scanDisposable = vscode.commands.registerCommand(
      "gettext-scanner.scan",
      async () => {
        let predifinedDirectory = config.get("scanPath") as string;

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
          if (predifinedDirectory) {
            predifinedDirectory = path.join(
              workspaceFolder.uri.fsPath,
              predifinedDirectory
            );
          } else {
            predifinedDirectory = path.join(workspaceFolder.uri.fsPath, "lib");
          }
        }

        let directory = await vscode.window.showInputBox({
          prompt: "Enter the directory to scan",
          placeHolder:
            "Enter the directory to scan, relative to the workspace root",
          value: predifinedDirectory,
        });

        if (directory !== undefined) {
          const scanner = new Scanner(directory);
          await scanner.scan();

          await vscode.window.showInformationMessage(
            `Scan completed, ${scanner.msgIdMap.size} msgids found`
          );
        }
      }
    );

    context.subscriptions.push(scanDisposable);
  }

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("gettext-scanner")) {
      vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
  });
}

// This method is called when your extension is deactivated
export function deactivate() {}
