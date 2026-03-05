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
                    description: nMatch[2].trim(),
                    tool: "",
                    workZone: "",
                    m00: false,
                    m01: false,
                    m08: false,
                    subprograms: new Set(),
                    feedRates: new Set(),
                    spindleSpeeds: new Set(),
                    minZ: Infinity,
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
                if (fMatch) currentOp.feedRates.add(fMatch[0]);

                const sMatch = line.match(/S(\d+)/i);
                if (sMatch) currentOp.spindleSpeeds.add(sMatch[0]);

                const zMatch = line.match(/Z(-?\d+(\.\d+)?)/i);
                if (zMatch) {
                    const zVal = parseFloat(zMatch[1]);
                    if (zVal < currentOp.minZ) currentOp.minZ = zVal;
                    if (zVal < globalMinZ) globalMinZ = zVal;
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

            const feeds = Array.from(op.feedRates).join(', ') || '-';
            const speeds = Array.from(op.spindleSpeeds).join(', ') || '-';
            const subs = Array.from(op.subprograms).join(', ') || '-';
            const minZ = op.minZ === Infinity ? '-' : `Z${op.minZ.toFixed(4)}`;

            const tCodeMatchWarn = (op.tool && parseInt(op.tool) !== parseInt(op.nCode))
                ? 'style="color: var(--accent); font-weight: bold;" title="T code does not match N code"'
                : '';

            tr.innerHTML = `
                <td>N${op.nCode} <br><span style="font-size:10px; opacity:0.6">${op.description}</span></td>
                <td>
                    <input type="text" class="inline-input tool-input" data-index="${index}" value="${op.tool}" ${tCodeMatchWarn}>
                </td>
                <td>
                    <input type="text" class="inline-input zone-input" data-index="${index}" value="${op.workZone}" placeholder="-">
                </td>
                <td><span class="badge ${op.m00 ? 'yes' : 'no'}">${op.m00 ? 'Y' : 'N'}</span></td>
                <td><span class="badge ${op.m01 ? 'yes' : 'no'}">${op.m01 ? 'Y' : 'N'}</span></td>
                <td><span class="badge ${op.m08 ? 'yes' : 'no'}">${op.m08 ? 'Y' : 'N'}</span></td>
                <td>${subs}</td>
                <td><span style="font-size: 11px">${feeds}</span></td>
                <td><span style="font-size: 11px">${speeds}</span></td>
                <td>${minZ}</td>
            `;
            tableBody.appendChild(tr);
        });

        document.querySelectorAll('.tool-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = e.target.getAttribute('data-index');
                parsedOperations[idx].tool = e.target.value.replace(/[^0-9]/g, '');
                if (parseInt(parsedOperations[idx].tool) === parseInt(parsedOperations[idx].nCode)) {
                    e.target.style = "";
                    e.target.title = "";
                }
                refreshGeneratedCode();
            });
        });

        document.querySelectorAll('.zone-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = e.target.getAttribute('data-index');
                parsedOperations[idx].workZone = e.target.value.toUpperCase();
                refreshGeneratedCode();
            });
        });
    }

    // --- Live Optimization Updates ---
    probingToggle.addEventListener('change', refreshGeneratedCode);
    lengthToggle.addEventListener('change', refreshGeneratedCode);

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

        let out = "% \n";
        out += `O99999 (${fileMeta.name}) \n`;

        const now = new Date();
        const stamp = now.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
        out += `(${stamp}) \n\n`;

        out += "(VARIABLES) \n\n";
        if (useProbing) out += `(#800: probing toggle) \n`;
        if (useLengthCheck) out += `(#899: tool length measurement toggle) \n`;
        out += "\n";

        let uniqueZones = new Set();
        let uniqueTools = new Set();
        let toolDescs = {};

        parsedOperations.forEach(op => {
            if (op.workZone) uniqueZones.add(op.workZone);
            if (op.tool) {
                uniqueTools.add(op.tool);
                toolDescs[op.tool] = op.description || `Tool ${op.tool}`;
            }
        });

        let zoneCounter = 851;
        uniqueZones.forEach(z => {
            out += `(#${zoneCounter}: work zone ${z}) \n`;
            zoneCounter++;
        });

        let subCounter = 801;
        uniqueTools.forEach(t => {
            out += `(#${subCounter}: ${toolDescs[t].replace(/[()]/g, '')}) \n`;
            subCounter++;
        });
        out += "\n";

        out += "G90 G17 G40 G80 G49 G94 \n\n";

        if (useProbing) {
            out += "IF [#800 EQ 1] GOTO31 \n";
            out += "N0 \n\n";
        }

        parsedOperations.forEach(op => {
            out += `N${op.nCode} ${op.description ? op.description : ''} \n`;

            if (useLengthCheck && op.tool) {
                out += `IF [#899 NE 1] GOTO${parseInt(op.nCode) * 100} (length measurement toggle) \n`;
                out += `G53 G0 Z0 \n`;
                out += `T#80${op.tool} M06 \n`;
                out += `G65 P9995 T#80${op.tool} A0.0 B1.0 C2.0 E0 D0 \n`;
                out += `G53 G0 Z0 \n`;
                out += `M01 \n\n`;
                out += `N${parseInt(op.nCode) * 100} \n`;
            }

            op.lines.forEach(line => {
                let modifiedLine = line;
                if (op.tool) {
                    modifiedLine = modifiedLine.replace(/T\d+/i, `T${op.tool}`);
                }
                if (op.workZone) {
                    modifiedLine = modifiedLine.replace(/G5[4-9]|G54\.1\s*P\d+/i, op.workZone);
                }
                out += modifiedLine + "\n";
            });
            out += "\n";
        });

        out += "M30 \n\n";

        if (useProbing) {
            out += "N31 (probing cycle)\n";
            out += "#853 = [#852-53]\n";
            out += "G0 G93 Z0\n";
            out += "T31 M06\n";
            out += "G0 G#852 X0 Y0\n";
            out += "G43 H31 Z2.50\n";
            out += "G65 P9832\n";
            out += "G65 P9810 Z0.1\n";
            out += "G65 P9811 Z0 S#853\n";
            out += "G65 P9833\n";
            out += "G0 Z2.50\n";
            out += "G53 Z0\n";
            out += "GOTO0\n\n";
        }

        out += "% \n";

        return out;
    }
});
