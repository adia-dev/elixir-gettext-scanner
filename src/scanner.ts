import { PathLike } from "fs";
import {
  readDirRecursive,
  readDirRecursiveAndExecute,
  readFileContent,
  saveData,
} from "./file";
import * as path from "path";

import { FileAnchor, GettextMsgId } from "./types";

class Scanner {
  private _directory: string;
  private _fileExtensions: string[];
  private _msgIdMap: Map<string, GettextMsgId>;
  private _regex: RegExp;
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

  constructor(
    directory: string,
    fileExtensions?: string[],
    functions?: string[],
    regex?: RegExp
  ) {
    this._directory = directory;

    if (fileExtensions) {
      this._fileExtensions = fileExtensions;
    } else {
      this._fileExtensions = [".*"];
    }

    this._msgIdMap = new Map();

    if (functions) {
      this._functions = functions;
    }

    if (regex) {
      this._regex = regex;
    } else {
      this._regex = new RegExp(
        `(${this._functions.join("|")})\\s*((?:\\(|")(.+?)(?:\\)|"))`,
        "g"
      );
    }
  }

  get msgIdMap() {
    return this._msgIdMap;
  }

  get directory() {
    return this._directory;
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

  set directory(directory: string) {
    this._directory = directory;
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

  private async _scanFile(filePath: string, ...args: any[]) {
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

  public async scan() {
    readDirRecursiveAndExecute(this._directory, this._scanFile.bind(this)).then(
      () => {
        let jsonData: string = JSON.stringify(
          [...this._msgIdMap.entries()],
          null,
          2
        );
        saveData(path.join(__dirname, "../data/msgids.json"), jsonData);

        const poData: string = Array.from(this._msgIdMap)
          .map(([_, msgid]) => this._formatAsPOEntry(msgid))
          .reduce((acc, curr) => acc + curr);

        saveData(path.join(__dirname, "../data/translations.po"), poData);
      }
    );
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
