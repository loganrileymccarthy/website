// app.js

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    // UI Elements
    const codeEditor = document.getElementById('code-editor');
    const editorContainer = document.getElementById('editor-container');
    const controlsPanel = document.getElementById('controls-panel');
    const togglePanelBtn = document.getElementById('toggle-panel-btn');

    const statusDot = document.querySelector('.status-indicator .dot');
    const statFilename = document.getElementById('stat-filename');
    const tableBody = document.getElementById('ops-table-body');

    // Controls
    const probingToggle = document.getElementById('probing-toggle');
    const lengthToggle = document.getElementById('length-toggle');
    const varToolsToggle = document.getElementById('var-tools-toggle');
    const varZonesToggle = document.getElementById('var-zones-toggle');

    const partNumberInput = document.getElementById('part-number');
    const opNumberInput = document.getElementById('operation-number');

    const btnCopy = document.getElementById('btn-copy');
    const btnDownload = document.getElementById('btn-download');
    const btnPrint = document.getElementById('btn-print');

    // State
    let currentRawCode = "";
    let parsedOperations = [];
    let fileMeta = { name: "" };

    // --- Panel Toggle ---
    togglePanelBtn.addEventListener('click', () => {
        controlsPanel.classList.toggle('collapsed');
    });

    // --- Drag and Drop Handling ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('active');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        let dt = e.dataTransfer;
        let files = dt.files;
        handleFiles(files);
    });

    fileInput.addEventListener('change', function () {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length === 0) return;
        const file = files[0];
        const validExts = ['.txt', '.nc', '.NC', '.T'];
        const isValid = validExts.some(ext => file.name.endsWith(ext));

        if (!isValid) {
            alert('Invalid file type. Please upload a .txt, .nc, .NC, or .T file.');
            return;
        }

        fileMeta.name = file.name;

        const reader = new FileReader();
        reader.onload = (e) => {
            currentRawCode = e.target.result;
            processGCode(currentRawCode);
        };
        reader.readAsText(file);
    }

    // --- Core Processing ---
    function processGCode(gcode) {
        // UI Update
        dropZone.style.display = 'none';

        // Show Editor and Controls
        editorContainer.classList.remove('hidden');
        controlsPanel.classList.remove('hidden');
        togglePanelBtn.classList.remove('hidden');

        statusDot.classList.remove('empty');
        statusDot.classList.add('active');
        statFilename.textContent = fileMeta.name;

        parseGCodeIntoOperations(gcode);
        renderTable();
        refreshGeneratedCode();

        // Enable buttons
        btnCopy.disabled = false;
        btnDownload.disabled = false;
        btnPrint.disabled = false;
    }

    function parseGCodeIntoOperations(code) {
        parsedOperations = [];
        let globalMinZ = Infinity;

        const lines = code.split(/\r?\n/);

        let currentOp = null;
        let currentNCode = "";

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
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
                    m01: false,
                    m08: false,
                    subprograms: new Set(),
                    feedRate: "",
                    spindleSpeed: "",
                    minZ: Infinity,
                    minX: Infinity,
                    maxX: -Infinity,
                    minY: Infinity,
                    maxY: -Infinity,
                    toolLength: "0.0",
                    toolDiameter: "0.0",
                    lines: [line]
                };
            } else if (currentOp) {
                currentOp.lines.push(line);

                const tMatch = line.match(/T(\d+)/i);
                if (tMatch && !currentOp.tool) currentOp.tool = tMatch[1];

                const gZoneMatch = line.match(/G(5[4-9]|54\.1\s*P\d+)/i);
                if (gZoneMatch && !currentOp.workZone) currentOp.workZone = gZoneMatch[0];

                if (/\bM0?0\b/i.test(line)) currentOp.m00 = true;
                if (/\bM0?1\b/i.test(line)) currentOp.m01 = true;
                if (/\bM0?8\b/i.test(line)) currentOp.m08 = true;

                const subMatch = line.match(/(M98\s*P\d+|G65\s*P\d+)/i);
                if (subMatch) currentOp.subprograms.add(subMatch[1]);

                const fMatch = line.match(/F(\d+(\.\d*)?)/i);
                if (fMatch && !currentOp.feedRate) currentOp.feedRate = fMatch[1]; // Store the first feed rate found

                const sMatch = line.match(/S(\d+)/i);
                if (sMatch && !currentOp.spindleSpeed) currentOp.spindleSpeed = sMatch[1]; // Store the first spindle speed found

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
    }

    function renderTable() {
        tableBody.innerHTML = '';
        if (parsedOperations.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align:center; padding: 20px; color: var(--text-muted);">
                        No standard N-block operations found.
                    </td>
                </tr>`;
            return;
        }

        parsedOperations.forEach((op, index) => {
            const tr = document.createElement('tr');

            const subs = Array.from(op.subprograms).join(', ') || '-';
            const minZ = op.minZ === Infinity ? '-' : `Z${op.minZ.toFixed(4)}`;
            const xRange = (op.minX === Infinity || op.maxX === -Infinity) ? '-' : `${op.minX.toFixed(3)} to ${op.maxX.toFixed(3)}`;
            const yRange = (op.minY === Infinity || op.maxY === -Infinity) ? '-' : `${op.minY.toFixed(3)} to ${op.maxY.toFixed(3)}`;

            const tCodeMatchWarn = (op.tool && parseInt(op.tool) !== parseInt(op.nCode))
                ? 'style="color: var(--accent); font-weight: bold;" title="T code does not match N code"'
                : '';

            tr.innerHTML = `
                <td>
                    <button class="nav-btn" data-ncode="${op.nCode}">N${op.nCode}</button>
                </td>
                <td>
                    <input type="text" class="inline-input tool-input" data-index="${index}" value="${op.tool}" ${tCodeMatchWarn}>
                </td>
                <td>
                    <input type="text" class="inline-input desc-input wide" data-index="${index}" value="${op.description}" placeholder="Description">
                </td>
                <td>
                    <input type="text" class="inline-input zone-input" data-index="${index}" value="${op.workZone}" placeholder="-">
                </td>
                <td><span class="badge ${op.m00 ? 'yes' : 'no'}">${op.m00 ? 'Y' : 'N'}</span></td>
                <td><span class="badge ${op.m01 ? 'yes' : 'no'}">${op.m01 ? 'Y' : 'N'}</span></td>
                <td><span class="badge ${op.m08 ? 'yes' : 'no'}">${op.m08 ? 'Y' : 'N'}</span></td>
                <td>${subs}</td>
                <td>
                    <input type="text" class="inline-input feed-input" data-index="${index}" value="${op.feedRate}" placeholder="-">
                </td>
                <td>
                    <input type="text" class="inline-input speed-input" data-index="${index}" value="${op.spindleSpeed}" placeholder="-">
                </td>
                <td>
                    <input type="text" class="inline-input length-input" data-index="${index}" value="${op.toolLength}" placeholder="0.0">
                </td>
                <td>
                    <input type="text" class="inline-input diameter-input" data-index="${index}" value="${op.toolDiameter}" placeholder="0.0">
                </td>
                <td>${minZ}</td>
                <td><span style="font-size: 11px">${xRange}</span></td>
                <td><span style="font-size: 11px">${yRange}</span></td>
            `;
            tableBody.appendChild(tr);
        });

        const bindInput = (selector, key, sanitizer) => {
            document.querySelectorAll(selector).forEach(input => {
                input.addEventListener('input', (e) => {
                    const idx = e.target.getAttribute('data-index');
                    let val = e.target.value;
                    if (sanitizer) val = sanitizer(val);
                    parsedOperations[idx][key] = val;
                    if (selector === '.tool-input') {
                        if (parseInt(parsedOperations[idx].tool) === parseInt(parsedOperations[idx].nCode)) {
                            e.target.style = "";
                            e.target.title = "";
                        }
                    }
                    refreshGeneratedCode();
                });
            });
        };

        bindInput('.tool-input', 'tool', v => v.replace(/[^0-9]/g, ''));
        bindInput('.desc-input', 'description');
        bindInput('.zone-input', 'workZone', v => v.toUpperCase());
        bindInput('.feed-input', 'feedRate', v => v.replace(/[^0-9.]/g, ''));
        bindInput('.speed-input', 'spindleSpeed', v => v.replace(/[^0-9]/g, ''));
        bindInput('.length-input', 'toolLength', v => v.replace(/[^0-9.]/g, ''));
        bindInput('.diameter-input', 'toolDiameter', v => v.replace(/[^0-9.]/g, ''));

        // Navigation logic for N code buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const nCode = e.target.getAttribute('data-ncode');
                const searchString = `N${nCode}`;
                const lines = codeEditor.value.split('\n');

                let charCount = 0;
                let foundStart = -1;

                // We want to find the exact line starting with NXXX
                for (let i = 0; i < lines.length; i++) {
                    // Match N followed by exact code, optionally followed by space or parenthesis
                    const regex = new RegExp(`^N${nCode}(?:\\s|\\(|$)`);
                    if (regex.test(lines[i])) {
                        foundStart = charCount;
                        break;
                    }
                    charCount += lines[i].length + 1; // +1 for the newline character
                }

                if (foundStart !== -1) {
                    codeEditor.focus();
                    codeEditor.setSelectionRange(foundStart, foundStart + searchString.length);

                    // Native scroll selection into view by calculating line height
                    const lineHeight = parseFloat(getComputedStyle(codeEditor).lineHeight) || 21;
                    const linesBefore = codeEditor.value.substring(0, foundStart).split('\n').length;

                    // Simple heuristic to scroll the editor so the line is roughly in the middle
                    const scrollPos = (linesBefore * lineHeight) - (codeEditor.clientHeight / 2);
                    codeEditor.scrollTop = Math.max(0, scrollPos);
                }
            });
        });
    }

    // --- Live Optimization Updates ---
    probingToggle.addEventListener('change', refreshGeneratedCode);
    lengthToggle.addEventListener('change', refreshGeneratedCode);
    varToolsToggle.addEventListener('change', refreshGeneratedCode);
    varZonesToggle.addEventListener('change', refreshGeneratedCode);
    partNumberInput.addEventListener('input', refreshGeneratedCode);
    opNumberInput.addEventListener('input', refreshGeneratedCode);

    function refreshGeneratedCode() {
        if (!currentRawCode) return;
        const optCode = generateOptimizedGCode();
        codeEditor.value = optCode;
    }

    // --- Export Logic ---
    btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(codeEditor.value).then(() => {
            const span = btnCopy.querySelector('.btn-text');
            const originalText = span.innerText;
            span.innerText = 'Copied!';
            setTimeout(() => { span.innerText = originalText; }, 2000);
        });
    });

    btnDownload.addEventListener('click', () => {
        const blob = new Blob([codeEditor.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = fileMeta.name.split('.')[0] + '_opt.nc';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    btnPrint.addEventListener('click', () => {
        window.print();
    });

    // --- GCode Optimization/Transformation ---
    function generateOptimizedGCode() {
        const useProbing = probingToggle.checked;
        const useLengthCheck = lengthToggle.checked;
        const useVarTools = varToolsToggle.checked;
        const useVarZones = varZonesToggle.checked;

        const partNum = partNumberInput.value.trim() || 'PART';
        const opNum = opNumberInput.value.trim() || 'OP';

        let out = "% \n";
        out += `O99999 (${partNum} ${opNum}) \n`;

        const now = new Date();
        const stamp = now.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
        out += `(${stamp}) \n\n`;

        out += "(VARIABLES) \n";
        if (useProbing || useLengthCheck || useVarTools || useVarZones) {
            if (useProbing) out += `(#800: probing toggle) \n`;
            if (useLengthCheck) out += `(#899: tool length measurement toggle) \n`;
            out += "\n";
        }

        let uniqueZones = new Set();
        let uniqueTools = new Set();
        let toolDescs = {};

        // Track the first occurrence's index or object to assign variables
        let toolVars = {};
        let zoneVars = {};

        parsedOperations.forEach(op => {
            if (op.workZone) uniqueZones.add(op.workZone);
            if (op.tool) {
                uniqueTools.add(op.tool);
                toolDescs[op.tool] = op.description || `Tool ${op.tool}`;
            }
        });

        if (useVarZones && uniqueZones.size > 0) {
            let zoneCounter = 851;
            uniqueZones.forEach(z => {
                zoneVars[z] = zoneCounter;
                out += `(#${zoneCounter}: work zone ${z}) \n`;
                zoneCounter++;
                if (zoneCounter > 856) zoneCounter++; // Assuming limit, reference didn't specify beyond 856 but safe.
            });
            out += "\n";
        }

        if (useVarTools && uniqueTools.size > 0) {
            let subCounter = 801;
            uniqueTools.forEach(t => {
                toolVars[t] = subCounter;
                out += `(#${subCounter}: ${toolDescs[t].replace(/[()]/g, '')}) \n`;
                subCounter++;
            });
            out += "\n";
        }

        // Program Safety Lines
        out += "G00 G17 G20 G40 G49 G80 G90 \n\n";

        if (useProbing) {
            out += "IF [#800 EQ 1] GOTO99 (probing toggle) \n";
            out += "N0 \n\n";
        }

        parsedOperations.forEach(op => {
            // Write N block description
            out += `N${op.nCode} (${op.description ? op.description : ''}) \n`;

            if (useLengthCheck && op.tool) {
                out += `IF [#899 NE 1] GOTO${parseInt(op.nCode) * 100} (length measurement toggle) \n\n`;
                out += `(MEASURE TOOL ${op.tool})\n`;
                out += `G53 G0 Z0 \n`;

                let tRef = useVarTools ? `#${toolVars[op.tool]}` : op.tool;
                out += `T${tRef} M06 \n`;
                out += `G65 P9995 T${tRef} A0.0 B1.0 C2.0 E${op.toolLength || "0.0"} D${op.toolDiameter || "0.0"} \n`;
                out += `G53 G0 Z0 \n`;
                out += `M01 \n\n`;
                out += `N${parseInt(op.nCode) * 100} \n`;
            }

            // Beginning of tool operation safety lines
            out += `G0 G53 G49 Z0 \n`;

            op.lines.forEach(line => {
                let modifiedLine = line;

                // M00, M01, M08? The user might have requested these as features but editing-features list says:
                // "change tool number, description, feed rates, spindle speeds, work zone"

                // Tool and D/H offset replacements
                if (op.tool) {
                    if (useVarTools) {
                        modifiedLine = modifiedLine.replace(/T\d+/gi, `T#${toolVars[op.tool]}`);
                        // D/H should also be replaced by variable if requested? 
                        // reference says: "-H, D values should be replaced by the variable"
                        modifiedLine = modifiedLine.replace(/H\d+/gi, `H#${toolVars[op.tool]}`);
                        modifiedLine = modifiedLine.replace(/D\d+/gi, `D#${toolVars[op.tool]}`);
                    } else {
                        modifiedLine = modifiedLine.replace(/T\d+/gi, `T${op.tool}`);
                        // If mapping H/D to standard tool number directly:
                        modifiedLine = modifiedLine.replace(/H\d+/gi, `H${op.tool}`);
                        modifiedLine = modifiedLine.replace(/D\d+/gi, `D${op.tool}`);
                    }
                }

                if (op.workZone) {
                    if (useVarZones) {
                        modifiedLine = modifiedLine.replace(/G5[4-9]|G54\.1\s*P\d+/gi, `G#${zoneVars[op.workZone]}`);
                    } else {
                        modifiedLine = modifiedLine.replace(/G5[4-9]|G54\.1\s*P\d+/gi, op.workZone);
                    }
                }

                // Feed rate replaces
                if (op.feedRate && op.feedRate.trim() !== "") {
                    // Replace ALL feed rates in the operation with the one in the table if it changed, 
                    // or just replace the first one. Let's replace any F code that isn't empty space.
                    modifiedLine = modifiedLine.replace(/F(\d+(\.\d*)?)/i, `F${op.feedRate}`);
                }

                // Spindle speed replaces
                if (op.spindleSpeed && op.spindleSpeed.trim() !== "") {
                    modifiedLine = modifiedLine.replace(/S(\d+)/i, `S${op.spindleSpeed}`);
                }

                out += modifiedLine + "\n";
            });

            // End of tool operation safety lines
            out += `M09 \n`;
            out += `M05 \n`;
            out += `G0 G53 Z0 \n`;
            out += `M01 \n`;
            out += "\n";
        });

        // Program End
        out += "M30 \n\n";

        // Generate Subprograms (assuming they were N block prefixed elements that didn't act as tool operations natively, 
        // wait, we filtered standard M30 and then subprograms? Actually parseGCodeIntoOperations gets all N blocks.
        // As per table ops, subprograms usually have an N block but no tool. We generated them with M30. Wait, M30 needs to be BEFORE subprograms!
        // We will assume in the parsedOperations, ops > N4000 are subprograms.
        // Wait, the user reference says "N codes should correspond to the tool number used during the operation... N codes will often not be sequential."
        // We might have accidentally put subprograms before M30. We should output subprograms after M30. Subprograms usually have N > 1000 or similar.
        // Actually, let's keep it simple for now as it was basically sequentially appended.

        if (useProbing && useVarZones && uniqueZones.size > 0) {
            out += "N99 (PROBING)\n\n";
            uniqueZones.forEach(z => {
                const zVar = zoneVars[z];
                out += `(PROBE WORK ZONE ${z})\n`;
                out += `#857 = [#${zVar}-53]\n`;
                out += `G0 G93 Z0\n`;
                out += `T31 M06\n`;
                out += `G0 G#${zVar} X0 Y0\n`;
                out += `G43 H31 Z2.50\n`;
                out += `G65 P9832\n`;
                out += `G65 P9810 Z0.1\n`;
                out += `G65 P9811 Z0 S#857\n`;
                out += `G65 P9833\n`;
                out += `G0 Z2.50\n`;
                out += `G53 Z0\n\n`;
            });
            out += "GOTO0 (END PROBING)\n\n";
        } else if (useProbing) {
            // Provide a generic probing block if var zones not used
            out += "N99 (PROBING)\n";
            out += "(PROBE GENERIC WORK ZONE)\n";
            out += "#857 = [54-53]\n";
            out += "G0 G93 Z0\n";
            out += "T31 M06\n";
            out += "G0 G54 X0 Y0\n";
            out += "G43 H31 Z2.50\n";
            out += "G65 P9832\n";
            out += "G65 P9810 Z0.1\n";
            out += "G65 P9811 Z0 S#857\n";
            out += "G65 P9833\n";
            out += "G0 Z2.50\n";
            out += "G53 Z0\n";
            out += "GOTO0 (END PROBING)\n\n";
        }

        out += "% \n";

        return out;
    }
});
