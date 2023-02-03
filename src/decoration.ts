import * as vscode from "vscode";
import Scanner from "./scanner";

const decoratorType: vscode.TextEditorDecorationType =
  vscode.window.createTextEditorDecorationType({
    backgroundColor: "#0077CC33",
    opacity: "0.5",
    borderRadius: "4px",
    border: "1px solid #0077CC",
    borderStyle: "dashed",
    borderColor: "#0077CC",
    color: "white",
    overviewRulerColor: "#0077CC",
    overviewRulerLane: vscode.OverviewRulerLane.Left,
  });

function triggerUpdateDecorations(
  scanner: Scanner,
  activeEditor: vscode.TextEditor
) {
  if (!activeEditor) {
    return;
  }
  const now = Date.now();
  const lastScanTime = scanner.lastScanTime;
  let diffInMinutes = Infinity;

  if (lastScanTime) {
    diffInMinutes = (now - lastScanTime) / (1000 * 60);
  }

  const text = activeEditor.document.getText();
  const matches: vscode.DecorationOptions[] = [];

  const regex = scanner.regex;

  let match;
  while ((match = regex.exec(text))) {
    let [_, func, __, msgid, _param1, _param2, _param3, _param4] = match;

    const gettextMsgId = scanner.msgIdMap.get(msgid);

    const startPos = activeEditor.document.positionAt(match.index);
    const endPos = activeEditor.document.positionAt(
      match.index + match[0].length
    );

    const decoration = {
      range: new vscode.Range(startPos, endPos),
      hoverMessage: "This is a msgid",
      line: match[0],
      gettextMsgId,
      scanned: diffInMinutes < 1.0,
    };
    matches.push(decoration);
  }

  const decorations = matches.map((match: any) => {
    let contentText = match.gettextMsgId
      ? "✗: translation is missing"
      : "✓: translated";
    if (!match.scanned) {
      if (diffInMinutes === Infinity) {
        contentText = `⚠: This file has not been scanned yet`;
      } else {
        contentText = `⚠: This file has not been scanned in the last ${Math.ceil(
          diffInMinutes
        )} minutes`;
      }
    }

    let color = match.gettextMsgId ? "#FF000077" : "#00FF0077";
    if (!match.scanned) {
      color = "#FFFF0077";
    }

    return {
      range: match.range,
      renderOptions: {
        after: {
          contentText,
          color,
        },
      },
      hoverMessage: match.hoverMessage,
    };
  });
  activeEditor.setDecorations(decoratorType, decorations);
}

export { triggerUpdateDecorations, decoratorType };
