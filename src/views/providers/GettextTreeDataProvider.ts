import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import Scanner from "../../scanner";
import { GettextMsgId } from "../../types";

export class GettextProvider implements vscode.TreeDataProvider<Gettext> {
  constructor(private scanner: Scanner, private workspaceRoot: string) {}

  private _onDidChangeTreeData: vscode.EventEmitter<
    Gettext | undefined | null | void
  > = new vscode.EventEmitter<Gettext | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    Gettext | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    console.log(this.scanner);
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Gettext): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getChildren(
    element?: any
  ): vscode.ProviderResult<Gettext[]> | Thenable<Gettext[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage("No msgids in empty workspace");
      return Promise.resolve([]);
    }

    if (element) {
      return Promise.resolve(this.getScannedMsgids());
    } else {
      if (this.scanner.msgIdMap.size === 0) {
        vscode.window.showInformationMessage(
          "Workspace has not been scanned for msgids yet !"
        );
      }
      return Promise.resolve(this.getScannedMsgids());
    }
  }

  private getScannedMsgids(): Gettext[] {
    const msgids: Gettext[] = Object.values([
      ...this.scanner.msgIdMap.entries(),
    ]).map(
      ([_, msgid]: [string, GettextMsgId]) =>
        new Gettext(
          msgid.id,
          msgid.function,
          vscode.TreeItemCollapsibleState.Collapsed
        )
    );
    return msgids;
    // return [
    //   new Gettext("Hello", "2.0", vscode.TreeItemCollapsibleState.Collapsed),
    // ];
  }

  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
    } catch (err) {
      return false;
    }
    return true;
  }
}

class Gettext extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    private version: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}-${this.version}`;
    this.description = this.version;
  }

  iconPath = {
    light: path.join(
      __filename,
      "..",
      "..",
      "resources",
      "light",
      "dependency.svg"
    ),
    dark: path.join(
      __filename,
      "..",
      "..",
      "resources",
      "dark",
      "dependency.svg"
    ),
  };
}
