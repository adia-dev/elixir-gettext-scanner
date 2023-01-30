interface FileAnchor {
  line: number;
  path: string;
  href?: string;
}

interface RegexFunction {
  name:
    | "gettext"
    | "ngettext"
    | "dgettext"
    | "dngettext"
    | "pgettext"
    | "npgettext"
    | "dpgettext"
    | "dnpgettext";
}

interface GettextMsgId {
  id: string;
  anchors: FileAnchor[];
  function: string;
}

interface SupportedLanguage {
  language: string;
  code: string;
}

export { FileAnchor, GettextMsgId, SupportedLanguage };
