const fs = require('fs');

const mocknc = fs.readFileSync('/home/logan/Workspace/website/tools/gcode-editor-v2/mock.nc', 'utf8');

// Copied subset of app.js state and parsing functions
let currentRawCode = "";
let currentHeader = "";
let parsedOperations = [];
let workZonesCount = {};
let globalZoneMap = {};
let fileMeta = { name: "mock.nc" };
let headerComments = [];

function parseGCodeIntoOperations(code) {
    parsedOperations = [];
    workZonesCount = {};
    globalZoneMap = {};
    let globalMinZ = Infinity;
    currentHeader = "";

    const lines = code.split(/\r?\n/);

    let currentOp = null;
    let currentNCode = "";

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (!currentOp) {
            const nMatch = line.match(/^N(\d+)(.*)/i);
            if (!nMatch) {
                currentHeader += lines[i] + "\n";
                continue;
            }
        }

        if (!line) continue;

        const nMatch = line.match(/^N(\d+)(.*)/i);
        if (nMatch) {
            if (currentOp && currentOp.nCode) {
                parsedOperations.push(currentOp);
            }
            currentNCode = nMatch[1];
            currentOp = {
                nCode: currentNCode,
                originalLine: line,
                description: nMatch[2] ? nMatch[2].replace(/[()]/g, '').trim() : "",
                tool: "",
                workZone: "",
                m00: false,
                m00Comment: "",
                m01: false,
                m08: false,
                subprograms: new Set(),
                feedRates: [],
                originalFeedRates: [],
                spindleSpeeds: [],
                originalSpindleSpeeds: [],
                minZ: Infinity,
                minX: Infinity,
                maxX: -Infinity,
                minY: Infinity,
                maxY: -Infinity,
                toolLength: "",
                toolDiameter: "",
                lines: [line]
            };
        } else if (currentOp) {
            currentOp.lines.push(line);

            const tMatch = line.match(/T(\d+)/i);
            if (tMatch && !currentOp.tool) currentOp.tool = tMatch[1];

            const gZoneMatch = line.match(/G(5[4-9]|54\.1\s*P\d+)/i);
            if (gZoneMatch) {
                let zoneStr = gZoneMatch[0].toUpperCase();
                workZonesCount[zoneStr] = (workZonesCount[zoneStr] || 0) + 1;
                if (!globalZoneMap[zoneStr]) globalZoneMap[zoneStr] = zoneStr;
                if (!currentOp.workZone) currentOp.workZone = zoneStr;
            }

            if (/\bM0?0\b/i.test(line)) {
                currentOp.m00 = true;
                let commentMatch = line.match(/\(([^)]+)\)/);
                if (commentMatch) {
                    currentOp.m00Comment = commentMatch[1];
                } else if (i + 1 < lines.length) {
                    let nextLine = lines[i + 1];
                    let nextCommentMatch = nextLine.match(/\(([^)]+)\)/);
                    if (nextCommentMatch) {
                        currentOp.m00Comment = nextCommentMatch[1];
                    }
                }
            }
            if (/\bM0?1\b/i.test(line)) currentOp.m01 = true;
            if (/\bM0?8\b/i.test(line)) currentOp.m08 = true;

            const subMatch = line.match(/(M98\s*P\d+|G65\s*P\d+)/i);
            if (subMatch) currentOp.subprograms.add(subMatch[1]);

            const fMatches = [...line.matchAll(/F(\d+(\.\d*)?)/ig)];
            fMatches.forEach(match => {
                const fVal = match[1];
                if (!currentOp.originalFeedRates.includes(fVal)) {
                    currentOp.originalFeedRates.push(fVal);
                    currentOp.feedRates.push(fVal);
                }
            });

            const sMatches = [...line.matchAll(/S(\d+)/ig)];
            sMatches.forEach(match => {
                const sVal = match[1];
                if (!currentOp.originalSpindleSpeeds.includes(sVal)) {
                    currentOp.originalSpindleSpeeds.push(sVal);
                    currentOp.spindleSpeeds.push(sVal);
                }
            });

            const zMatch = line.match(/Z(-?\d+(\.\d+)?)/i);
            if (zMatch) {
                const zVal = parseFloat(zMatch[1]);
                if (zVal < currentOp.minZ) currentOp.minZ = zVal;
                if (zVal < globalMinZ) globalMinZ = zVal;
            }

            const xMatch = line.match(/X(-?\d+(\.\d+)?)/i);
            if (xMatch) {
                const xVal = parseFloat(xMatch[1]);
                if (xVal < currentOp.minX) currentOp.minX = xVal;
                if (xVal > currentOp.maxX) currentOp.maxX = xVal;
            }

            const yMatch = line.match(/Y(-?\d+(\.\d+)?)/i);
            if (yMatch) {
                const yVal = parseFloat(yMatch[1]);
                if (yVal < currentOp.minY) currentOp.minY = yVal;
                if (yVal > currentOp.maxY) currentOp.maxY = yVal;
            }
        }
    }
    if (currentOp && currentOp.nCode) {
        parsedOperations.push(currentOp);
    }

    headerComments = [];
    if (currentHeader) {
        let headerLines = currentHeader.split('\n');
        let newHeaderLines = [];
        let oCodeFound = false;
        let extracting = false;

        for (let i = 0; i < headerLines.length; i++) {
            let line = headerLines[i].trim();
            
            if (!oCodeFound && /^O\d+/i.test(line)) {
                oCodeFound = true;
                extracting = true;
                newHeaderLines.push(headerLines[i]);
                continue;
            }

            if (extracting) {
                if (line.startsWith('(') && line.endsWith(')')) {
                    if (line === '(VARIABLES)') {
                        extracting = false;
                        newHeaderLines.push(headerLines[i]);
                    } else {
                        let inner = line.slice(1, -1).trim();
                        if (inner && inner !== 'VARIABLES') {
                            headerComments.push(inner);
                        } else {
                            newHeaderLines.push(headerLines[i]);
                        }
                    }
                } else if (line !== '') {
                    extracting = false;
                    newHeaderLines.push(headerLines[i]);
                } else {
                    newHeaderLines.push(headerLines[i]);
                }
            } else {
                newHeaderLines.push(headerLines[i]);
            }
        }
        currentHeader = newHeaderLines.join('\n');
    }
}

try {
    parseGCodeIntoOperations(mocknc);
    console.log("Success parsing! Operations length:", parsedOperations.length);
} catch (e) {
    console.error("Error during parse:", e);
}

