import { PathLike } from "fs";
import {
  readDirRecursive,
  readDirRecursiveAndExecute,
  readFileContent,
  saveData,
} from "./file";
import * as path from "path";
import * as fs from "fs";

import { FileAnchor, GettextMsgId } from "./types";

class Scanner {
  private _fileExtensions: string[];
  private _msgIdMap: Map<string, GettextMsgId>;
  private _existingMsgIds: Map<string, GettextMsgId>;
  private _regex: RegExp;
  private _lastScanTime: number | undefined;
  private _functions: string[] = [
    "gettext",
    "ngettext",
    "dgettext",
    "dngettext",
    "pgettext",
    "npgettext",
    "dpgettext",
    "dnpgettext",
  ];

  constructor(fileExtensions?: string[], functions?: string[], regex?: RegExp) {
    if (fileExtensions) {
      this._fileExtensions = fileExtensions;
    } else {
      this._fileExtensions = [".*"];
    }

    this._msgIdMap = new Map();
    this._existingMsgIds = new Map();

    if (functions) {
      this._functions = functions;
    }

    if (regex) {
      this._regex = regex;
    } else {
      this._regex = new RegExp(
        `(${this._functions.join(
          "|"
        )})\\s*(?:\\()?("([^"]*)")(("([^"]*)"\\s*,\\s*)+)?\\s*("([^"]*)"\\s*\\)?|(?:.+)\\))?`,
        "g"
      );
    }

    this._lastScanTime = undefined;
  }

  get msgIdMap() {
    return this._msgIdMap;
  }

  get fileExtensions() {
    return this._fileExtensions;
  }

  get functions() {
    return this._functions;
  }

  get regex() {
    return this._regex;
  }

  get lastScanTime() {
    return this._lastScanTime;
  }

  set fileExtensions(fileExtensions: string[]) {
    this._fileExtensions = fileExtensions;
  }

  set functions(functions: string[]) {
    this._functions = functions;
  }

  set regex(regex: RegExp) {
    this._regex = regex;
  }

  set msgIdMap(msgIdMap: Map<string, GettextMsgId>) {
    this._msgIdMap = msgIdMap;
  }

  set lastScanTime(lastScanTime: number | undefined) {
    this._lastScanTime = lastScanTime;
  }

  public async scanFile(filePath: string, ...args: any[]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filePath} does not exist`);
    }

    let matches: RegExpExecArray | null;

    const fileContent = await readFileContent(filePath);
    const lines = fileContent.split(/\r?\n/);
    let lineNumber = 0;

    lines.forEach((line) => {
      lineNumber++;

      while ((matches = this._regex.exec(line)) !== null) {
        let [_, gettextFunction, __, id] = matches;

        if (id.startsWith('"')) {
          id = id.substring(1, id.length);
        }

        // check if the msgid does already exist
        if (this._existingMsgIds.has(id)) {
          continue;
        }

        let msgid = this._msgIdMap.get(id);
        const newAnchor: FileAnchor = {
          path: filePath,
          line: lineNumber,
          href: `${filePath}:${lineNumber}`,
        };

        if (msgid !== undefined) {
          msgid.anchors.push(newAnchor);
        } else {
          this._msgIdMap.set(id, {
            id,
            anchors: [newAnchor],
            function: gettextFunction,
          });
        }
      }
    });
  }

  private async _scanMsgIdsFile(filePath: string, ...args: any[]) {
    let msgidRegEx = new RegExp(`msgid\\s+"(.+?)"`, "g");
    let matches: RegExpExecArray | null;

    const fileContent = await readFileContent(filePath);
    const lines = fileContent.split(/\r?\n/);
    let lineNumber = 0;

    lines.forEach((line) => {
      lineNumber++;

      while ((matches = msgidRegEx.exec(line)) !== null) {
        let [_, id] = matches;

        let msgid = this._existingMsgIds.get(id);

        if (msgid !== undefined) {
          msgid.anchors.push({
            path: filePath,
            line: lineNumber,
            href: `${filePath}:${lineNumber}`,
          });
        } else {
          this._existingMsgIds.set(id, {
            id,
            anchors: [
              {
                path: filePath,
                line: lineNumber,
                href: `${filePath}:${lineNumber}`,
              },
            ],
            function: "msgid",
          });
        }
      }
    });
  }

  public async scan(directory: string) {
    // check if the directory exists
    if (!fs.existsSync(directory)) {
      throw new Error(`Directory ${directory} does not exist`);
    }

    this._lastScanTime = Date.now();
    await readDirRecursiveAndExecute(directory, this.scanFile.bind(this)).then(
      async () => {
        let jsonData: string = JSON.stringify(
          [...this._msgIdMap.entries()],
          null,
          2
        );
        await saveData(path.join(__dirname, "../tmp/msgids.json"), jsonData);

        const poData: string = Array.from(this._msgIdMap)
          .map(([_, msgid]) => this._formatAsPOEntry(msgid))
          .reduce((acc, curr) => acc + curr);

        await saveData(path.join(__dirname, "../tmp/translations.po"), poData);
      }
    );
  }

  public async scanExistingMsgIds(directory: string) {
    // check if the directory exists
    if (!fs.existsSync(directory)) {
      throw new Error(`Directory ${directory} does not exist`);
    }

    await readDirRecursiveAndExecute(
      directory,
      this._scanMsgIdsFile.bind(this)
    ).then(async () => {
      let jsonData: string = JSON.stringify(
        [...this._existingMsgIds.entries()],
        null,
        2
      );
      await saveData(
        path.join(__dirname, "../tmp/existing-msgids.json"),
        jsonData
      );
    });
  }

  private _formatAsPOEntry(msgid: GettextMsgId) {
    let entry: string;

    entry = msgid.anchors.reduce(
      (acc: string, curr) => acc + `#: ${curr.path}:${curr.line}\r\n`,
      ""
    );

    entry += `msgid \"${msgid.id}\"\r\n`;
    entry += `msgstr \"\"\r\n\r\n`;

    return entry;
  }
}

export default Scanner;
