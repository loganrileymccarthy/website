#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parseGcodeIntoOperations } = require('./js/gcode-parser.js');

const args = process.argv.slice(2);

if (args.length === 0) {
    console.error('Usage: ./cli.js <path/to/file.nc>');
    process.exit(1);
}

const filePath = path.resolve(process.cwd(), args[0]);

if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

const fileContent = fs.readFileSync(filePath, 'utf8');

try {
    const result = parseGcodeIntoOperations(fileContent);
    const operations = result.parsedOperations.map(op => ({
        'N Code': `N${op.nCode}`,
        'Description': op.description || '',
        'Tool': op.tool ? `T${op.tool}` : '',
        'Work Zone': op.workZone || '',
        'Min Z': op.minZ === Infinity ? '' : op.minZ.toFixed(4)
    }));

    if (operations.length === 0) {
        console.log('No operations found in this file.');
    } else {
        console.table(operations);
    }
} catch (error) {
    console.error('Error parsing G-code:', error);
    process.exit(1);
}
