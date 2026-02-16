import './utils.js';
import { addCode, updateM0Comment, updateFeedRate, updateSpindleSpeed } from './operations.js';
import './probing.js';

// Prevent scroll wheel from changing number input values
document.addEventListener('wheel', function (e) {
    if (document.activeElement.type === 'number') {
        document.activeElement.blur();
    }
});

export function analyzeText() {
    const text = document.getElementById('textInput').value;
    const tableBody = document.querySelector('#operationsTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    if (!text) return;

    // --- Work Zones Analysis ---
    const workZonesContainer = document.getElementById('workZones');
    // Remove comments for analysis
    const textNoComments = text.replace(/\([^)]*\)/g, '');

    const zoneCounts = {};
    // Match G54-G59
    const standardZones = textNoComments.match(/G5[4-9]\b/g) || [];
    standardZones.forEach(zone => {
        zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
    });

    // Match G154 P1-99 (with optional leading zero for P)
    // User requested "G154 P1"-"G154 P99".
    // Regex matches G154 followed by whitespace, then P, then optional 0, then 1-99.
    const extendedZonesRegex = /G154\s+P0?([1-9]\d?)\b/gi;
    let extendedMatch;
    while ((extendedMatch = extendedZonesRegex.exec(textNoComments)) !== null) {
        const zoneNum = extendedMatch[1];
        const zoneLabel = `G154 P${zoneNum}`;
        zoneCounts[zoneLabel] = (zoneCounts[zoneLabel] || 0) + 1;
    }

    if (Object.keys(zoneCounts).length > 0) {
        const sortedZones = Object.keys(zoneCounts).sort();
        workZonesContainer.innerHTML = sortedZones.map(zone => {
            // Extract just the number/identifier part for the input
            // G54 -> 54
            // G154 P1 -> 154.01
            let inputVal = '';
            if (zone.startsWith('G5')) {
                inputVal = zone.substring(1);
            } else if (zone.startsWith('G154')) {
                const pVal = zone.split('P')[1];
                inputVal = `154.${pVal.padStart(2, '0')}`;
            }
            
            return `
            <div style="display: inline-block; margin: 10px;">
                <input type="number" 
                        class="work-zone-input" 
                        value="${inputVal}" 
                        data-original="${inputVal}"
                        onchange="updateWorkZone(this)" 
                />
                <span style="font-size: 0.8em; color: #888;">(${zoneCounts[zone]})</span>
            </div>
            `;
        }).join('');
    } else {
        workZonesContainer.textContent = '*NO ZONES FOUND*';
    }

    // --- N-Code Analysis ---
    // Find all N numbers and their positions
    const nRegex = /N(\d+)/g;
    let match;
    const nMatches = [];

    while ((match = nRegex.exec(text)) !== null) {
        nMatches.push({
            fullMatch: match[0],
            number: match[1],
            index: match.index,
            endIndex: match.index + match[0].length
        });
    }

    if (nMatches.length === 0) return;

    // Process each N block
    for (let i = 0; i < nMatches.length; i++) {
        const currentN = nMatches[i];
        const nextN = nMatches[i + 1];

        // Define the block range: from current N start to next N start (or end of text)
        const blockStart = currentN.index;
        const blockEnd = nextN ? nextN.index : text.length;
        const blockText = text.substring(blockStart, blockEnd);

        // 1. Find comments on the SAME LINE as the N number
        // We need to find the end of the line where N is found
        const textAfterN = text.substring(currentN.endIndex);
        const lineEndIndex = textAfterN.indexOf('\n');
        const lineContent = text.substring(currentN.index, lineEndIndex === -1 ? undefined : currentN.endIndex + lineEndIndex);

        const commentRegex = /\((.*?)\)/g;
        let commentMatch;
        const comments = [];
        while ((commentMatch = commentRegex.exec(lineContent)) !== null) {
            comments.push(commentMatch[0]); // Push the full comment including parens
        }

        // 2. Check for M0/M1/M8
        // We should strip comments from blockText before checking.
        let blockTextCleaned = blockText.replace(/\([^)]*\)/g, '');

        const hasM0 = /M0?0\b/.test(blockTextCleaned);
        const hasM1 = /M0?1\b/.test(blockTextCleaned);
        const hasM8 = /M0?8\b/.test(blockTextCleaned);

        // 3. Extract all T numbers in the block
        const tRegex = /T\s*(\d+)/gi;
        const tNumbers = new Set();
        let tMatch;
        while ((tMatch = tRegex.exec(blockTextCleaned)) !== null) {
            tNumbers.add(parseInt(tMatch[1], 10));
        }

        // 4. Extract all H numbers and check for mismatches
        const hRegex = /H\s*(\d+)/gi;
        let hMatch;
        let hError = false; // True if mismatch found
        const hCounts = {};
        while ((hMatch = hRegex.exec(blockTextCleaned)) !== null) {
            const hVal = parseInt(hMatch[1], 10);
            hCounts[hVal] = (hCounts[hVal] || 0) + 1;
            if (!tNumbers.has(hVal)) {
                hError = true;
            }
        }

        // 5. Extract all D numbers and check for mismatches
        const dRegex = /D\s*(\d+)/gi;
        let dMatch;
        let dError = false; // True if mismatch found
        const dCounts = {};
        while ((dMatch = dRegex.exec(blockTextCleaned)) !== null) {
            const dVal = parseInt(dMatch[1], 10);
            dCounts[dVal] = (dCounts[dVal] || 0) + 1;
            if (!tNumbers.has(dVal)) {
                dError = true;
            }
        }

        // 6. Extract all F numbers in the block
        const fRegex = /F(\d*\.?\d+)/g;
        let fMatch;
        const fCounts = {};
        while ((fMatch = fRegex.exec(blockTextCleaned)) !== null) {
            const fVal = fMatch[1]; // Keep as string to preserve formatting if needed, or parse if strictly numeric comparison desired.
            // Usually F values are integers or simple floats. Let's keep them as found but maybe strip leading zeros if they are integers?
            // For now, just use the captured string.
            const fNum = parseFloat(fVal); // Normalize 100.00 to 100
            fCounts[fNum] = (fCounts[fNum] || 0) + 1;
        }

        // 7. Extract all S (Spindle) numbers in the block
        const sRegex = /S\s*(\d+)/gi;
        let sMatch;
        const sCounts = {};
        while ((sMatch = sRegex.exec(blockTextCleaned)) !== null) {
            const sVal = parseInt(sMatch[1], 10);
            sCounts[sVal] = (sCounts[sVal] || 0) + 1;
        }

        // 8. Find lowest Z coordinate in the block
        const zRegex = /Z\s*([-+]?\d*\.?\d+)/gi;
        let zMatch;
        let minZ = Infinity;
        let hasZ = false;

        while ((zMatch = zRegex.exec(blockTextCleaned)) !== null) {
            const zVal = parseFloat(zMatch[1]);
            if (!isNaN(zVal)) {
                if (zVal < minZ) {
                    minZ = zVal;
                }
                hasZ = true;
            }
        }

        // 9. Create table
        const row = document.createElement('tr');

        // N cell
        const cellN = document.createElement('td');
        // Create a button-link for the N code
        const jumpBtn = document.createElement('button');
        jumpBtn.textContent = currentN.fullMatch;
        jumpBtn.className = 'text-btn';
        jumpBtn.onclick = () => jumpToCode(currentN.index);
        cellN.appendChild(jumpBtn);
        row.appendChild(cellN);

        // Comments cell
        const cellComments = document.createElement('td');
        const commentInput = document.createElement('input');
        commentInput.type = 'text';
        commentInput.value = comments.join(' ');
        commentInput.placeholder = 'comment';
        cellComments.appendChild(commentInput);
        row.appendChild(cellComments);

        // T cell
        const cellT = document.createElement('td');
        if (tNumbers.size > 0) {
            cellT.textContent = Array.from(tNumbers).join(', ');
        } else {
            cellT.textContent = '-';
        }
        row.appendChild(cellT);

        // M code cells
        const createStatusCellWithButton = (hasCode, codeName, allowComment = false) => {
            const cell = document.createElement('td');
            if (hasCode) {
                cell.textContent = 'Yes';
                cell.style.color = '#4caf50';
            } else {
                cell.textContent = '';
                cell.style.color = '#f44336';
                
                let commentInput = null;
                if (allowComment) {
                        commentInput = document.createElement('input');
                        commentInput.type = 'text';
                        commentInput.placeholder = 'comment';
                        commentInput.style.width = '80px';
                        commentInput.style.marginRight = '5px';
                        cell.appendChild(commentInput);
                }

                const btn = document.createElement('button');
                btn.textContent = `Add`;
                btn.style.fontSize = '10px';
                btn.style.padding = '5px';
                btn.style.marginLeft = '5px';
                btn.onclick = () => {
                    let comment = null;
                    if (commentInput && commentInput.value.trim() !== "") {
                        comment = commentInput.value.trim();
                    }
                    addCode(currentN.index, nextN ? nextN.index : text.length, codeName, comment);
                };
                cell.appendChild(btn);
            }
            return cell;
        };

        // Special handling for M0
        const cellM0 = document.createElement('td');
        
        // Extract unique instances of M0 in the block
        const m0Regex = /M0?0\b/g;
        let m0Match;
        const m0Matches = [];
        // Search in blockText (which is raw from text)
        while ((m0Match = m0Regex.exec(blockText)) !== null) {
            m0Matches.push({
                startInBlock: m0Match.index,
                endInBlock: m0Match.index + m0Match[0].length,
                text: m0Match[0]
            });
        }

        if (m0Matches.length > 0) {
            m0Matches.forEach((m0, idx) => {
                const m0AbsStart = blockStart + m0.startInBlock;
                const m0AbsEnd = blockStart + m0.endInBlock;
                
                // Find the end of the line containing M0
                const restOfText = text.substring(m0AbsEnd);
                const lineBreakIndex = restOfText.indexOf('\n');
                const endOfLineIndex = (lineBreakIndex === -1) ? text.length : m0AbsEnd + lineBreakIndex;
                
                // Look at the VERY NEXT line for a comment
                let commentValue = "";
                
                if (endOfLineIndex < text.length) {
                        const nextLineStart = endOfLineIndex + 1;
                        const nextLineEndMatch = text.substring(nextLineStart).indexOf('\n');
                        const nextLineEnd = (nextLineEndMatch === -1) ? text.length : nextLineStart + nextLineEndMatch;
                        const nextLine = text.substring(nextLineStart, nextLineEnd).trim();
                        
                        if (nextLine.startsWith('(') && nextLine.endsWith(')')) {
                            commentValue = nextLine.substring(1, nextLine.length - 1);
                        }
                }

                const wrapper = document.createElement('div');
                if (idx > 0) wrapper.style.marginTop = '5px';

                const label = document.createElement('span');
                label.textContent = (idx + 1) + ". ";
                label.style.fontWeight = 'bold';
                
                const input = document.createElement('input');
                input.type = 'text';
                input.value = commentValue;
                input.placeholder = 'comment';
                input.style.width = '120px';
                
                // Store data for updating
                input.dataset.m0Index = m0AbsStart; 
                input.onchange = function() { updateM0Comment(this); };

                wrapper.appendChild(label);
                wrapper.appendChild(input);
                cellM0.appendChild(wrapper);
            });
        } else {
                // No M0 found, fallback to Add button
                cellM0.textContent = '';
                cellM0.style.color = '#f44336';
                
                const commentInput = document.createElement('input');
                commentInput.type = 'text';
                commentInput.placeholder = 'comment';
                commentInput.style.width = '80px';
                commentInput.style.marginRight = '5px';
                cellM0.appendChild(commentInput);

                const btn = document.createElement('button');
                btn.textContent = `Add`;
                btn.style.fontSize = '10px';
                btn.style.padding = '5px';
                btn.style.marginLeft = '5px';
                btn.onclick = () => {
                let comment = null;
                if (commentInput && commentInput.value.trim() !== "") {
                    comment = commentInput.value.trim();
                }
                    addCode(currentN.index, nextN ? nextN.index : text.length, 'M00', comment);
                };
                cellM0.appendChild(btn);
        }
        row.appendChild(cellM0);

        row.appendChild(createStatusCellWithButton(hasM1, 'M01'));
        row.appendChild(createStatusCellWithButton(hasM8, 'M08'));

        // H Err Cell
        const cellHErr = document.createElement('td');
        if (Object.keys(hCounts).length === 0) {
            cellHErr.textContent = '-';
        } else {
            const hParts = [];
            for (const [val, count] of Object.entries(hCounts)) {
                hParts.push(`H${val}: ${count}`);
            }
            cellHErr.innerHTML = hParts.join('<br>');
            cellHErr.style.color = hError ? '#f44336' : '#4caf50'; // Red if error, Green if OK
        }
        row.appendChild(cellHErr);

        // D Err Cell
        const cellDErr = document.createElement('td');
        if (Object.keys(dCounts).length === 0) {
            cellDErr.textContent = '-';
        } else {
            const dParts = [];
            for (const [val, count] of Object.entries(dCounts)) {
                dParts.push(`D${val}: ${count}`);
            }
            cellDErr.innerHTML = dParts.join('<br>');
            cellDErr.style.color = dError ? '#f44336' : '#4caf50'; // Red if error, Green if OK
        }
        row.appendChild(cellDErr);

        // S (spindle RPM) Cell
        const cellS = document.createElement('td');
        if (Object.keys(sCounts).length > 0) {
            const sParts = [];
            for (const [val, count] of Object.entries(sCounts)) {
                // Create input for each S code
                const wrapper = document.createElement('div');
                wrapper.className = 'feed-rate-item'; // Reuse class if suitable, or just inline
                
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'feed-rate-input'; // Reuse styling
                input.value = val;
                input.dataset.original = val;
                input.dataset.start = blockStart;
                input.dataset.end = blockEnd;
                input.onchange = function() { updateSpindleSpeed(this); };
                
                const countSpan = document.createElement('span');
                countSpan.style.fontSize = '0.8em';
                countSpan.style.color = '#888';
                countSpan.textContent = ` (${count})`;
                
                wrapper.appendChild(input);
                wrapper.appendChild(countSpan);
                sParts.push(wrapper);
            }
            // Append all wrappers
            sParts.forEach(el => cellS.appendChild(el));
        } else {
            cellS.textContent = '-';
        }
        row.appendChild(cellS);

        // F (feed rates) Cell
        const cellFeed = document.createElement('td');
        if (Object.keys(fCounts).length > 0) {
            const fParts = [];
            for (const [val, count] of Object.entries(fCounts)) {
                // Create input for each feed rate
                const wrapper = document.createElement('div');
                wrapper.className = 'feed-rate-item';
                
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'feed-rate-input';
                input.value = val;
                input.dataset.original = val;
                input.dataset.start = blockStart;
                input.dataset.end = blockEnd;
                input.onchange = function() { updateFeedRate(this); };
                
                const countSpan = document.createElement('span');
                countSpan.style.fontSize = '0.8em';
                countSpan.style.color = '#888';
                countSpan.textContent = ` (${count})`;
                
                wrapper.appendChild(input);
                wrapper.appendChild(countSpan);
                fParts.push(wrapper);
            }
            // Append all wrappers
            fParts.forEach(el => cellFeed.appendChild(el));
        } else {
            cellFeed.textContent = '-';
        }
        row.appendChild(cellFeed);

        // Min Z Cell
        const cellMinZ = document.createElement('td');
        cellMinZ.textContent = hasZ ? minZ : '-';
        row.appendChild(cellMinZ);

        tableBody.appendChild(row);
    }
}

// Attach to window
window.analyzeText = analyzeText;

// Add event listener for real-time analysis
const textInput = document.getElementById('textInput');
if (textInput) {
    console.log("G-code Editor: initializing drag and drop on textInput");
    textInput.addEventListener('input', analyzeText);

    textInput.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    textInput.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    });

    textInput.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const dt = e.dataTransfer;
        const files = dt.files;
        
        console.log("File dropped:", files);

        if (files && files.length > 0) {
            const file = files[0];
            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.txt') || fileName.endsWith('.nc')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    textInput.value = e.target.result;
                    analyzeText();
                };
                reader.readAsText(file);
            } else {
                alert('Please drop a .txt or .nc file.');
            }
        }
    });

    // Prevent default drop on the entire window to be safe
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
} else {
    console.error("G-code Editor: textInput not found!");
}
