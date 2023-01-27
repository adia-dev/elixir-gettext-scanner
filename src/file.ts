import * as fs from "fs/promises";
import * as path from "path";

const readDirRecursive = async (directory: string) => {
  const files: string[] = [];
  const dirents = await fs.readdir(directory, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.resolve(directory, dirent.name);
    if (dirent.isDirectory()) {
      files.push(...(await readDirRecursive(res)));
    } else {
      files.push(res);
    }
  }
  return files;
};

const readDirRecursiveAndExecute = async (
  directory: string,
  callback: (file: string, ...args: any[]) => Promise<any>,
  ...args: any[]
) => {
  const dirents = await fs.readdir(directory, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.resolve(directory, dirent.name);
    if (dirent.isDirectory()) {
      await readDirRecursiveAndExecute(res, callback);
    } else {
      await callback(res, ...args);
    }
  }
};

const readFileContent = async (filePath: string) => {
  const fileContent = await fs.readFile(filePath, "utf-8");
  return fileContent;
};

const saveData = async (filePath: string, data: string) => {
  await fs.writeFile(filePath, data);
};

export {
  readDirRecursive,
  readDirRecursiveAndExecute,
  readFileContent,
  saveData,
};
