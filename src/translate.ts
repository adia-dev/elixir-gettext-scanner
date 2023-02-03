import { SupportedLanguage } from "./types";
import * as path from "path";

// Imports the Google Cloud client library
const { Translate } = require("@google-cloud/translate").v2;
const supportedLanguages: SupportedLanguage[] = require(path.resolve(
  __dirname,
  "../data/supported_languages.json"
))?.languages;

// Instantiates a client

async function translateText(text: string, target: string): Promise<string> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;

  if (!projectId) {
    return text;
  }

  const translate = new Translate({ projectId });

  // if the text is empty, return an empty string
  if (!text) {
    return "";
  }

  // if the target language is empty, return the original text
  if (!target) {
    return text;
  }

  // check if the target language is supported by comparing the target language with the supported languages
  const isSupported = supportedLanguages.find(
    (lang) => lang.code === target || lang.language === target
  );

  if (!isSupported) {
    return text;
  }

  // Translates some text into the target language
  const [translation] = await translate.translate(text, target);

  return translation;
}

export { translateText };
