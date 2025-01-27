import fs from 'fs';
import { join } from 'path';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getAllFiles(dir) {
  let fileList = [];
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    if (['.git', 'node_modules'].includes(file)) return;

    const filePath = join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      fileList = [...fileList, ...getAllFiles(filePath)];
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');

  const { inputFolder } = await inquirer.prompt({
    type: 'input',
    name: 'inputFolder',
    message: 'Digite o caminho da pasta (ex: ./src):',
    default: './',
    validate: value => !!value.trim() || 'Caminho inválido!'
  });

  console.log(chalk.cyan(`\n🔍 Buscando arquivos em "${inputFolder}"...`));
  const allFiles = getAllFiles(inputFolder);

  if (!allFiles.length) {
    console.log(chalk.red('Nenhum arquivo encontrado!'));
    return;
  }

  const { selectedFiles } = await inquirer.prompt({
    type: 'checkbox',
    name: 'selectedFiles',
    message: `Selecione os arquivos (${allFiles.length} encontrados):`,
    choices: allFiles.map(file => ({
      name: file,
      checked: false
    })),
    pageSize: 20
  });

  const { outputFile } = await inquirer.prompt({
    type: 'input',
    name: 'outputFile',
    message: 'Nome do arquivo de saída (ex: merged.txt):',
    default: 'merged.txt'
  });

  if (!selectedFiles.length) {
    console.log(chalk.yellow('⚠️ Nenhum arquivo selecionado!'));
    return;
  }

  try {
    const outputPath = path.join('output', outputFile);
    const outputDir = path.dirname(outputPath);

    fs.mkdirSync(outputDir, { recursive: true });

    const outputStream = fs.createWriteStream(outputPath);
    selectedFiles.forEach(file => {
      const relativePath = path.relative(projectRoot, file);
      const displayPath = `/${relativePath}`.replace(/\\/g, '/');
      const content = fs.readFileSync(file, 'utf8');
      outputStream.write(`\n// ==== ${displayPath} ====\n\n${content}\n`);
    });
    outputStream.end();
    console.log(chalk.green(`\n✅ ${selectedFiles.length} arquivos mesclados em "${outputPath}"`));
  } catch (error) {
    console.error(chalk.red('❌ Erro:'), error.message);
  }
}

main();