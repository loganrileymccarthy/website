import { analyzeText } from './app.js';

export function addCode(start, end, codeToInsert, optionalComment = null) {
    const textArea = document.getElementById('textInput');
    const fullText = textArea.value;
    const blockText = fullText.substring(start, end);

    // Find M6 or M06
    const m6Regex = /M0?6\b/g;
    const match = m6Regex.exec(blockText);

    if (!match) {
        alert(`No tool change (M6) found in this block. Cannot automatically add ${codeToInsert}.`);
        return;
    }

    // Find the end of the line where M6 is located
    // match.index is relative to blockText
    const m6IndexInBlock = match.index;
    const textAfterM6 = blockText.substring(m6IndexInBlock);
    const lineEndIndex = textAfterM6.indexOf('\n');

    // Calculate insertion point relative to fullText
    // If no newline found (end of block), append to end of block
    const insertionOffsetInBlock = (lineEndIndex === -1) ? blockText.length : (m6IndexInBlock + lineEndIndex);
    const insertionPoint = start + insertionOffsetInBlock;

    let insertStr = `\n${codeToInsert}`;
    if (optionalComment) {
        insertStr += `\n(${optionalComment})`;
    }

    const newText = fullText.substring(0, insertionPoint) + insertStr + fullText.substring(insertionPoint);

    textArea.value = newText;
    analyzeText(); // Refresh analysis
}

export function addTimestamp() {
    const textArea = document.getElementById('textInput');
    const text = textArea.value;

    // Find O-code (e.g., O1234) at the start of a line
    const oRegex = /^O\d+.*$/m;
    const match = oRegex.exec(text);

    if (!match) {
        alert('No O-code found. Cannot add timestamp.');
        return;
    }

    const now = new Date();
    // Format: YYYY-MM-DD HH:MM:SS
    const dateStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0');

    const noteInput = document.getElementById('timestampNote');
    const note = noteInput.value.trim();

    let timestampComment;
    if (note) {
        timestampComment = `(${dateStr} ${timeStr} - ${note})`;
    } else {
        timestampComment = `(${dateStr} ${timeStr})`;
    }

    // Insert after the O-code line
    const insertionIndex = match.index + match[0].length;

    // Check if there's already a newline after O-code
    const nextChar = text[insertionIndex];
    let newText;

    if (nextChar === '\n') {
        newText = text.substring(0, insertionIndex) + `\n${timestampComment}` + text.substring(insertionIndex);
    } else {
        // If EOF or no newline, just append
        newText = text.substring(0, insertionIndex) + `\n${timestampComment}` + text.substring(insertionIndex);
    }

    textArea.value = newText;
    analyzeText();
}

export function insertBlockAfterHeader(blockContent) {
    const textArea = document.getElementById('textInput');
    const text = textArea.value;

    // "After any lines that are just comments at the beginning, but before any other codes."
    // Assuming "at the beginning" means after the O-number (program start).
    
    const oRegex = /^O\d+.*$/m;
    const oMatch = oRegex.exec(text);

    if (!oMatch) {
        alert('No O-code found. Cannot automatically place block.');
        return;
    }

    const oLineEndIndex = oMatch.index + oMatch[0].length;
    
    let currentIdx = oLineEndIndex;
    if (text[currentIdx] === '\n') currentIdx++; // Skip the newline after O-line immediately
    
    // Now scan line by line from currentIdx
    while (currentIdx < text.length) {
        const nextNewline = text.indexOf('\n', currentIdx);
        const lineEnd = (nextNewline === -1) ? text.length : nextNewline;
        const line = text.substring(currentIdx, lineEnd).trim();
        
        if (line.length === 0 || line.startsWith('(')) {
            // Skip this line
            currentIdx = (nextNewline === -1) ? text.length : nextNewline + 1;
        } else {
            // Found code!
            break;
        }
    }
    
    // Insert at currentIdx
    const before = text.substring(0, currentIdx);
    const after = text.substring(currentIdx);
    
    // We want to insert `${blockContent}\n` 
    // If we are inserting at the start of a line, we just prepend `blockContent\n`.
    // If we are at EOF, we might need a preceding newline if `before` doesn't end with one?
    // Actually `before` usually ends with `\n` because we incremented past it in the loop.
    
    // Edge case: O1000 (no newline). currentIdx would be end.
    if (before.length > 0 && before[before.length - 1] !== '\n') {
            textArea.value = before + '\n' + blockContent + '\n' + after;
    } else {
            textArea.value = before + blockContent + '\n' + after;
    }
    
    analyzeText();
}

export function updateWorkZone(input) {
    const oldVal = input.dataset.original;
    const newVal = input.value;
    changeWorkZones(oldVal, newVal);
}

export function changeWorkZones(findZone, replaceZone) {
    if (!findZone || !replaceZone) {
        return;
    }

    applyReplacement((text) => {
        let replacementsCount = 0;
        let result = text;
        const replacements = { G: 0 };
        
            // Check if we are dealing with extended work offsets (decimals)
        if (findZone.includes('.')) {
            // Extended work offsets (e.g. 154.1 -> G154 P1)
            const [findG, findP] = findZone.split('.');
            // Allow replaceZone to be decimal or just number if user typed "154" for example. 
            // But if it's G154 logic, likely expecting input like 154.2
            
            let replaceG = '154', replaceP = '1';
            if(replaceZone.includes('.')) {
                [replaceG, replaceP] = replaceZone.split('.');
            } else {
                // slightly ambiguous if they just type 154 or 54. 
                // Let's assume input format "154.XX" for consistency with existing logic or "54"
                // If they type 54, maybe they want to switch to G54? 
                
                // IF we are replacing TO a standard G code (54-59)
                if (parseInt(replaceZone) >= 54 && parseInt(replaceZone) <= 59 && !replaceZone.includes('.')) {
                        // SPECIAL CASE: Convert G154 Px -> G5y
                        // Regex for G154 P<findP>
                        const pattern = new RegExp(`(G)${findG}(\\s+)P0?${findP}(\\b)`, 'gi');
                        result = result.replace(pattern, (match, letter, whitespace, boundary) => {
                        replacementsCount++;
                        replacements[letter]++;
                        return `${letter}${replaceZone}${boundary}`; // Removes P and P-value
                    });
                    
                        return { 
                        newText: result, 
                        count: replacementsCount, 
                        details: replacementsCount > 0 ? { [`${findZone}→${replaceZone}`]: replacements } : {}
                    };
                }
                
                // Fallback/Default assumption: They just typed the P number or something? 
                // Let's stick to the previous implementation logic but handle string split safely.
                replaceG = '154'; // default
                replaceP = replaceZone; // treat whole input as P if no dot?
            }

            // Regex for G154 Px
            // Matches G<findG> (whitespace) P<findP>
            const pattern = new RegExp(`(G)${findG}(\\s+)P0?${findP}(\\b)`, 'gi');

            result = result.replace(pattern, (match, letter, whitespace, boundary) => {
                replacementsCount++;
                replacements[letter]++;
                return `${letter}${replaceG}${whitespace}P${replaceP}${boundary}`;
            });

        } else {
            // Standard work offsets (e.g. 54 -> G54)
            const pattern = /([G])0*(\d{1,3})(\s|$)/g;

            result = result.replace(pattern, (match, letter, capturedNum, whitespace) => {
                if (parseInt(capturedNum, 10) === parseInt(findZone, 10)) {
                    replacementsCount++;
                        replacements[letter]++;
                    
                    // Check if replacing with extended (e.g. swapping 54 -> 154.1)
                    if (replaceZone.includes('.')) {
                        const [rG, rP] = replaceZone.split('.');
                        return `${letter}${rG} P${rP}${whitespace}`;
                    }

                    const replaceFormatted = replaceZone.toString();
                    return `${letter}${replaceFormatted}${whitespace}`;
                }
                return match;
            });
        }
        
        return { 
            newText: result, 
            count: replacementsCount, 
            details: replacementsCount > 0 ? { [`${findZone}→${replaceZone}`]: replacements } : {}
        };
    });
}

export function changeToolNumbers() {
    const findTool = document.getElementById('findTool').value;
    const replaceTool = document.getElementById('replaceTool').value;

    if (findTool === '' || replaceTool === '') {
        alert('Please enter both "Prev." and "New" tool numbers.');
        return;
    }

    applyReplacement((text) => {
        let replacementsCount = 0;
        const replacements = { T: 0, N: 0, H: 0, D: 0 };
        const replaceToolFormatted = replaceTool.toString().padStart(2, '0');

        // Regex for finding the tool in the block (e.g. T1, T01)
        // Using \D|$ to ensure we don't match T10 when looking for T1
        const tPattern = new RegExp(`T\\s*0*${findTool}(\\D|$)`, 'i');

        // Regex for replacing N/T/H/D in the valid block
        const replacePattern = /([TNHD])0*(\d{1,2})(\s|$)/gi;

        let newText = "";
        let lastIndex = 0;
        const nRegex = /N(\d+)/g;
        let match;

        const processChunk = (chunk) => {
            // Only process this chunk if it contains the target Tool code
            if (tPattern.test(chunk)) {
                return chunk.replace(replacePattern, (m, letter, capturedNum, whitespace) => {
                    if (parseInt(capturedNum, 10) === parseInt(findTool, 10)) {
                        replacementsCount++;
                        const key = letter.toUpperCase();
                        if (replacements[key] !== undefined) {
                            replacements[key]++;
                        }
                        return `${letter}${replaceToolFormatted}${whitespace}`;
                    }
                    return m;
                });
            }
            return chunk;
        };

        while ((match = nRegex.exec(text)) !== null) {
            // Extract text from end of last known position up to start of current N-code
            const chunk = text.substring(lastIndex, match.index);
            newText += processChunk(chunk);
            lastIndex = match.index;
        }
        // Process the final block (from last N to end of file)
        const lastChunk = text.substring(lastIndex);
        newText += processChunk(lastChunk);

            return { 
            newText: newText, 
            count: replacementsCount, 
            details: replacementsCount > 0 ? { [`${findTool}→${replaceTool}`]: replacements } : {}
        };
    });
}

export function updateFeedRate(input) {
    const oldVal = input.dataset.original;
    const newVal = input.value;
    const start = parseInt(input.dataset.start, 10);
    const end = parseInt(input.dataset.end, 10);
    changeFeedRates(oldVal, newVal, start, end);
}

export function changeFeedRates(findFeed, replaceFeed, start, end) {
    if (!findFeed || !replaceFeed) {
        return;
    }

    // Scoped replacement if start/end provided
    if (start !== undefined && !isNaN(start) && end !== undefined && !isNaN(end)) {
        const textArea = document.getElementById('textInput');
        const fullText = textArea.value;
        const blockText = fullText.substring(start, end);

        // Temporarily mask comments in the block to avoid replacing inside them
        const commentPattern = /\([^)]*\)/g;
        const comments = [];
        const blockTextNoComments = blockText.replace(commentPattern, (match) => {
            comments.push(match);
            return `__COMMENT_${comments.length - 1}__`;
        });

        // Regex: F followed by number.
        const pattern = /F(\d*\.?\d+)(\s|$)/g;
        let replaced = false;

        const newBlockNoComments = blockTextNoComments.replace(pattern, (match, capturedNum, whitespace) => {
            if (parseFloat(capturedNum) === parseFloat(findFeed)) {
                replaced = true;
                return `F${replaceFeed}${whitespace}`;
            }
            return match;
        });

        if (replaced) {
            // Restore comments
            let finalBlock = newBlockNoComments;
            comments.forEach((comment, index) => {
                finalBlock = finalBlock.replace(`__COMMENT_${index}__`, comment);
            });

            // Reconstruct full text
            const newFullText = fullText.substring(0, start) + finalBlock + fullText.substring(end);
            textArea.value = newFullText;
            analyzeText();
        }
        return;
    }

    // Fallback for global replacement (unused for feed rates now?)
    applyReplacement((text) => {
        let replacementsCount = 0;
            const replacements = { F: 0 };

        // Regex: F followed by number.
        const pattern = /F(\d*\.?\d+)(\s|$)/g;

        const result = text.replace(pattern, (match, capturedNum, whitespace) => {
            if (parseFloat(capturedNum) === parseFloat(findFeed)) {
                replacementsCount++;
                replacements['F']++;
                return `F${replaceFeed}${whitespace}`;
            }
            return match;
        });

        return { 
            newText: result, 
            count: replacementsCount, 
            details: replacementsCount > 0 ? { [`${findFeed}→${replaceFeed}`]: replacements } : {}
        };
    });
}

export function updateSpindleSpeed(input) {
    const oldVal = input.dataset.original;
    const newVal = input.value;
    const start = parseInt(input.dataset.start, 10);
    const end = parseInt(input.dataset.end, 10);
    changeSpindleSpeeds(oldVal, newVal, start, end);
}

export function changeSpindleSpeeds(findSpeed, replaceSpeed, start, end) {
    if (!findSpeed || !replaceSpeed) {
        return;
    }

        if (start !== undefined && !isNaN(start) && end !== undefined && !isNaN(end)) {
        const textArea = document.getElementById('textInput');
        const fullText = textArea.value;
        const blockText = fullText.substring(start, end);

        const commentPattern = /\([^)]*\)/g;
        const comments = [];
        const blockTextNoComments = blockText.replace(commentPattern, (match) => {
            comments.push(match);
            return `__COMMENT_${comments.length - 1}__`;
        });

        // Regex: S followed by number.
        const pattern = /S\s*(\d+)(\s|$)/g; 
        let replaced = false;

        const newBlockNoComments = blockTextNoComments.replace(pattern, (match, capturedNum, whitespace) => {
            // S values are typically integers
            if (parseInt(capturedNum, 10) === parseInt(findSpeed, 10)) {
                replaced = true;
                return `S${replaceSpeed}${whitespace}`;
            }
            return match;
        });

        if (replaced) {
            let finalBlock = newBlockNoComments;
            comments.forEach((comment, index) => {
                finalBlock = finalBlock.replace(`__COMMENT_${index}__`, comment);
            });

            const newFullText = fullText.substring(0, start) + finalBlock + fullText.substring(end);
            textArea.value = newFullText;
            analyzeText();
        }
        return;
    }
}

export function updateM0Comment(inputElement) {
    const textArea = document.getElementById('textInput');
    const text = textArea.value;
    const m0Index = parseInt(inputElement.dataset.m0Index);
    
    if (isNaN(m0Index)) return;

    // Find the end of the line containing this M0
    const restOfText = text.substring(m0Index);
    const lineBreakIndex = restOfText.indexOf('\n');
    const endOfLineIndex = (lineBreakIndex === -1) ? text.length : m0Index + lineBreakIndex;
    
    const newComment = inputElement.value.trim();
    const commentBlock = newComment ? `(${newComment})` : '';

    // Check next line
    let nextLineStart = -1;
    let nextLineEnd = -1;
    let hasComment = false;

    if (endOfLineIndex < text.length) {
        nextLineStart = endOfLineIndex + 1;
        const nextLineEndMatch = text.substring(nextLineStart).indexOf('\n');
        nextLineEnd = (nextLineEndMatch === -1) ? text.length : nextLineStart + nextLineEndMatch;
        const currentNextLine = text.substring(nextLineStart, nextLineEnd).trim();
        
        if (currentNextLine.startsWith('(') && currentNextLine.endsWith(')')) {
            hasComment = true;
        }
    }
    
    let newText;
    
    if (hasComment) {
        // Replace existing comment line
        const prefix = text.substring(0, nextLineStart);
        const suffix = text.substring(nextLineEnd);
        
        if (commentBlock) {
            newText = prefix + commentBlock + suffix;
        } else {
            // Remove the line entirely (including the preceding newline)
            newText = text.substring(0, endOfLineIndex) + text.substring(nextLineEnd);
        }
    } else {
        // Insert new comment line
        if (commentBlock) {
            const prefix = text.substring(0, endOfLineIndex);
            const suffix = text.substring(endOfLineIndex);
            
            if (suffix.startsWith('\n')) {
                    newText = prefix + '\n' + commentBlock + suffix;
            } else {
                newText = prefix + '\n' + commentBlock;
            }
        } else {
                return;
        }
    }

    textArea.value = newText;
    analyzeText();
}

export function applyReplacement(replacementLogic) {
    const textArea = document.getElementById('textInput');
    const text = textArea.value;

    if (!text) {
        alert('Please enter some text to process.');
        return;
    }

    // Remove comments temporarily
    const commentPattern = /\([^)]*\)/g;
    const comments = [];
    let textWithoutComments = text.replace(commentPattern, (match) => {
        comments.push(match);
        return `__COMMENT_${comments.length - 1}__`;
    });

    // Apply specific replacement logic
    const { newText, count, details } = replacementLogic(textWithoutComments);

    // Restore comments
    let finalResult = newText;
    comments.forEach((comment, index) => {
        finalResult = finalResult.replace(`__COMMENT_${index}__`, comment);
    });

    textArea.value = finalResult;

    // Stats
    let statsHTML = '';
    if (count > 0 && details) {
            for (const [pair, replacements] of Object.entries(details)) {
            const detailStr = Object.entries(replacements)
                .filter(([letter, c]) => c > 0)
                .map(([letter, c]) => `${letter}:${c}`)
                .join(' ');
            if (detailStr) {
                statsHTML += `${detailStr} ${pair}<br>`;
            }
        }
    } else {
        statsHTML = 'No replacements made.';
    }
    //document.getElementById('stats').innerHTML = statsHTML; /*Disabled stats readout*/
    analyzeText();
}

// Attach to window
window.addCode = addCode;
window.addTimestamp = addTimestamp;
window.insertBlockAfterHeader = insertBlockAfterHeader;
window.updateWorkZone = updateWorkZone;
window.changeWorkZones = changeWorkZones;
window.changeToolNumbers = changeToolNumbers;
window.updateFeedRate = updateFeedRate;
window.changeFeedRates = changeFeedRates;
window.updateSpindleSpeed = updateSpindleSpeed;
window.changeSpindleSpeeds = changeSpindleSpeeds;
window.updateM0Comment = updateM0Comment;
window.applyReplacement = applyReplacement;
