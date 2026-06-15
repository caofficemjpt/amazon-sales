import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

function nodeParseFile(content: string, options: any): Promise<any> {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      ...options,
      complete: (results) => resolve(results),
      error: (err) => reject(err),
    });
  });
}

async function inspectHeaders() {
  const inputDir = path.resolve('C:/Users/manan/Downloads/Projects/Amazon/Amazone - April/');
  const files = fs.readdirSync(inputDir);
  const txtFiles = files.filter(f => f.endsWith('.txt'));

  for (const name of txtFiles) {
    const filePath = path.join(inputDir, name);
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = await nodeParseFile(content, { delimiter: '\t', header: true, skipEmptyLines: true });
    
    // Find a row where amount-description or any value is Cost of Advertising
    const found = parsed.data.find((row: any) => 
      Object.values(row).some(v => String(v).includes('Cost of Advertising'))
    );
    
    if (found) {
      console.log('Row with Cost of Advertising:');
      // Print non-empty columns
      const entries = Object.entries(found).filter(([, v]) => String(v).trim() !== '');
      console.log(entries);
      break;
    }
  }
}

inspectHeaders();
