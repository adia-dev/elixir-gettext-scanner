import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import Scanner from "../../scanner";
import { FileAnchor, GettextMsgId } from "../../types";

export class GettextProvider implements vscode.TreeDataProvider<Gettext> {
  constructor(private scanner: Scanner, private workspaceRoot: string) {}

  private _onDidChangeTreeData: vscode.EventEmitter<
    Gettext | undefined | null | void
  > = new vscode.EventEmitter<Gettext | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    Gettext | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Gettext): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getChildren(element?: any): vscode.ProviderResult<Gettext[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage("No msgids in empty workspace");
      return Promise.resolve([]);
    }

    if (element) {
      if (element instanceof Gettext) {
        const anchors: FileAnchor[] =
          this.scanner.msgIdMap.get(element.msgid)?.anchors || [];
        return Promise.resolve(
          anchors.map(
            (anchor: FileAnchor) =>
              new Gettext(
                "",
                `${anchor.path}:${anchor.line}`,
                vscode.TreeItemCollapsibleState.None,
                "",
                "",
                {
                  command: "vscode.open",
                  title: "Open File",
                  arguments: [
                    vscode.Uri.file(
                      path.resolve(this.workspaceRoot, anchor.path)
                    ),
                    {
                      selection: new vscode.Range(
                        new vscode.Position(anchor.line, 0),
                        new vscode.Position(anchor.line, 0)
                      ),
                    },
                  ],
                }
              )
          )
        );
      } else {
        return Promise.resolve([]);
      }
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
          `${msgid.id} (${msgid.anchors.length})`,
          msgid.anchors.length > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.Collapsed
        )
    );
    return msgids;
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

export class Gettext extends vscode.TreeItem {
  constructor(
    public readonly msgid: string,
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly description?: string,
    public readonly tooltip?: string,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.description = description;
    this.command = command;
    this.tooltip = tooltip;
    this.iconPath = {
      light: path.join(
        __filename,
        "..",
        "..",
        "resources",
        "images",
        "light",
        "refresh.svg"
      ),
      dark: path.join(
        __filename,
        "..",
        "..",
        "resources",
        "images",
        "dark",
        "refresh.svg"
      ),
    };
  }
}
