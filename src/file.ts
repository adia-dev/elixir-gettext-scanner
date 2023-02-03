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
      try {
        await callback(res, ...args);
      } catch (error) {
        console.error(error);
      }
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

const fileExists = async (filePath: string) => {
  try {
    fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

const absoluteToRelativePath = (filePath: string, rootPath: string) => {
  return path.relative(rootPath, filePath);
};

export {
  readDirRecursive,
  readDirRecursiveAndExecute,
  readFileContent,
  saveData,
  fileExists,
};
