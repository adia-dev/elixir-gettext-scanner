import path = require("path");
import * as vscode from "vscode";
import * as fs from "fs";
import Scanner from "./scanner";
import {
  Gettext,
  GettextProvider,
} from "./views/providers/GettextTreeDataProvider";
import { fileExists } from "./file";
import { translateText } from "./translate";
import * as dotenv from "dotenv";
import { triggerUpdateDecorations } from "./decoration";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export function activate(context: vscode.ExtensionContext) {
  const rootPath =
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;
  const config = vscode.workspace.getConfiguration("gettext-scanner");
  const scanner = new Scanner();
  const scanPath = config.get("scanPath");
  let poFilesPath = config.get("poFilesPath");

  if (!config.get("enabled")) {
    vscode.window.showInformationMessage("Gettext Scanner is disabled");
    return;
  }

  // check if the workspace has a mix.exs file in the root
  if (!rootPath || !path.resolve(rootPath, "mix.exs")) {
    vscode.window.showErrorMessage("No mix project found");
    return;
  } else {
    vscode.window.showInformationMessage(
      "mix.exs file found, you can scan this workspace for gettext strings"
    );
  }

  if (!rootPath) {
    vscode.window.showErrorMessage("No workspace found");
    return;
  }

  if (!scanPath) {
    vscode.window.showErrorMessage("No scan path found");
    return;
  }

  if (!poFilesPath) {
    vscode.window.showErrorMessage("No po files path found");
    poFilesPath = "priv/gettext";
  }

  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    triggerUpdateDecorations(scanner, activeEditor);
  }

  let scanPathAbs = path.resolve(rootPath, scanPath as string);
  let scanPathWorkspace = path.relative(
    path.resolve(rootPath, ".."),
    scanPathAbs
  );
  let poFilesPathAbs = path.resolve(rootPath, poFilesPath as string);
  let poFilesPathWorkspace = path.relative(
    path.resolve(rootPath, ".."),
    poFilesPathAbs
  );
  const gettextProvider: GettextProvider = new GettextProvider(
    scanner,
    rootPath
  );

  const disposable = vscode.commands.registerCommand(
    "gettext-scanner.scan",
    async () => {
      if (!fileExists(poFilesPathAbs)) {
        vscode.window.showErrorMessage(
          `No po files found at ${poFilesPathWorkspace}`
        );
        return;
      }

      if (!fileExists(scanPathAbs)) {
        vscode.window.showErrorMessage(
          `No scan path found at ${scanPathWorkspace}`
        );
        return;
      }
      await scanner.scan(scanPathAbs);

      vscode.window.showInformationMessage(
        `Scanned ${scanPathWorkspace}, and found ${scanner.msgIdMap.size} translatable strings`
      );
    }
  );

  const refreshDisposable = vscode.commands.registerCommand(
    "gettext-scanner.refresh",
    async () => {
      if (!fileExists(poFilesPathAbs)) {
        vscode.window.showErrorMessage(
          `No po files found at ${poFilesPathWorkspace}`
        );
        return;
      }

      if (!fileExists(scanPathAbs)) {
        vscode.window.showErrorMessage(
          `No scan path found at ${scanPathWorkspace}`
        );
        return;
      }

      scanner.msgIdMap.clear();
      await scanner.scanExistingMsgIds(poFilesPathAbs);
      await scanner.scan(scanPathAbs);

      gettextProvider.refresh();
      if (activeEditor) {
        triggerUpdateDecorations(scanner, activeEditor);
      }

      vscode.window.showInformationMessage(
        `Refreshed ${scanPathWorkspace}, and found ${scanner.msgIdMap.size} translatable strings`
      );
    }
  );

  vscode.window.registerTreeDataProvider("gettextMsgids", gettextProvider);

  vscode.commands.registerCommand(
    "gettext-scanner.scanAndRefresh",
    async () => {
      if (!fileExists(poFilesPathAbs)) {
        vscode.window.showErrorMessage(
          `No po files found at ${poFilesPathWorkspace}`
        );
        return;
      }

      if (!fileExists(scanPathAbs)) {
        vscode.window.showErrorMessage(
          `No scan path found at ${scanPathWorkspace}`
        );
        return;
      }

      await scanner.scanExistingMsgIds(poFilesPathAbs);
      await scanner.scan(scanPathAbs);
      gettextProvider.refresh();

      if (activeEditor) {
        triggerUpdateDecorations(scanner, activeEditor);
      }

      vscode.window.showInformationMessage(
        `Scanned and refreshed ${scanPathWorkspace}, and found ${scanner.msgIdMap.size} translatable strings`
      );
    }
  );

  vscode.commands.registerCommand(
    "gettext-scanner.copyMsgid",
    async (msgid: Gettext) => {
      await vscode.env.clipboard.writeText(msgid.label);
    }
  );

  vscode.commands.registerCommand(
    "gettext-scanner.deleteMsgid",
    async (msgid: Gettext) => {
      scanner.msgIdMap.delete(msgid.label);
      gettextProvider.refresh();
      if (activeEditor) {
        triggerUpdateDecorations(scanner, activeEditor);
      }
    }
  );

  vscode.commands.registerCommand(
    "gettext-scanner.addToPoFile",
    async (msgid: Gettext) => {
      if (!fileExists(poFilesPathAbs)) {
        vscode.window.showErrorMessage("No po files found");
        return;
      }

      // ask which locale to add the msgid to
      // to get the locales read the directory names in the poFilesPath
      const locales = fs
        .readdirSync(poFilesPathAbs)
        .filter((file) =>
          fs.statSync(path.join(poFilesPathAbs, file)).isDirectory()
        );

      const selectedLocales = await vscode.window.showQuickPick(locales, {
        title: "Select a locale",
        placeHolder: "Select a locale",
        canPickMany: true,
      });

      // ask the user if he wants to use the google translate api to translate the msgid
      const useGoogleTranslate = await vscode.window.showQuickPick(
        ["Yes", "No"],
        {
          title: "Use Google Translate?",
          placeHolder: "Use Google Translate?",
        }
      );

      if (!selectedLocales) {
        vscode.window.showErrorMessage("No locale selected");
        return;
      }

      // add the msgid to the selected locales
      selectedLocales.forEach(async (locale) => {
        const poFilePath = path.join(
          poFilesPathAbs,
          locale,
          "LC_MESSAGES",
          "default.po"
        );
        const msgidData = scanner.msgIdMap.get(msgid.msgid);

        if (!msgidData) {
          vscode.window.showErrorMessage("No msgid data found");
          return;
        }

        const anchors = msgidData.anchors
          .map((anchor) => `#: ${anchor.path}:${anchor.line}`)
          .join("\r\n");

        const msgidStr = `msgid "${msgid.msgid}"\r\n`;
        let msgstr: string;

        if (useGoogleTranslate === "Yes") {
          // msgstr = translate(msgid.msgid, { to: locale });

          const translated = await translateText(msgid.msgid, locale);

          msgstr = `msgstr "${translated}"`;
        } else {
          msgstr = 'msgstr ""';
        }

        // check the number of newlines at the end of the file, put 2 if there is none, 1 if there is one etc...

        const msgidBlock = `\r\n\r\n${anchors}\r\n${msgidStr}${msgstr}`;

        fs.writeFileSync(poFilePath, msgidBlock, { flag: "a" });
      });

      vscode.window.showInformationMessage(
        `Added msgid to ${selectedLocales.join(", ")}`
      );
    }
  );

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (activeEditor) {
        triggerUpdateDecorations(scanner, activeEditor);
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations(scanner, activeEditor);
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeConfiguration(
    (event) => {
      if (event.affectsConfiguration("gettext-scanner.poFilesPath")) {
        poFilesPathWorkspace = vscode.workspace
          .getConfiguration("gettext-scanner")
          .get("poFilesPath") as string;
        poFilesPathAbs = path.join(
          vscode.workspace.rootPath as string,
          poFilesPathWorkspace
        );

        if (!fileExists(poFilesPathAbs)) {
          vscode.window.showErrorMessage(
            `No po files found at ${poFilesPathWorkspace}`
          );
          return;
        }
      }

      if (event.affectsConfiguration("gettext-scanner.scanPath")) {
        scanPathWorkspace = vscode.workspace
          .getConfiguration("gettext-scanner")
          .get("scanPath") as string;
        scanPathAbs = path.join(
          vscode.workspace.rootPath as string,
          scanPathWorkspace
        );

        if (!fileExists(scanPathAbs)) {
          vscode.window.showErrorMessage(
            `No scan path found at ${scanPathWorkspace}`
          );
          return;
        }
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidSaveTextDocument(
    async (document) => {
      if (activeEditor && document === activeEditor.document) {
        scanner.lastScanTime = Date.now();
        scanner.msgIdMap.clear();
        await scanner.scanExistingMsgIds(poFilesPathAbs);
        await scanner.scanFile(document.fileName);
        gettextProvider.refresh();
        triggerUpdateDecorations(scanner, activeEditor);
      }
    },
    null,
    context.subscriptions
  );

  context.subscriptions.push(refreshDisposable);
  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
