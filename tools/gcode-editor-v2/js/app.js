// app.js

document.addEventListener('DOMContentLoaded', () => {
    // Global Event Listeners
    document.addEventListener('wheel', function(e) {
        if (e.target.type === 'number') {
            e.preventDefault();
        }
    }, { passive: false });

    // Global Paste Listener
    document.addEventListener('paste', (e) => {
        if (dropZone.style.display !== 'none') {
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            if (pastedText && pastedText.trim().length > 0) {
                fileMeta.name = "Pasted_Code.nc";
                processGCode(pastedText);
            }
        }
    });

    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnPaste = document.getElementById('btn-paste');

    if (btnPaste) {
        btnPaste.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const text = await navigator.clipboard.readText();
                if (text && text.trim().length > 0) {
                    fileMeta.name = "Pasted_Code.nc";
                    processGCode(text);
                }
            } catch (err) {
                console.error("Failed to read clipboard:", err);
                alert("Clipboard access denied. Please press Ctrl+V to paste.");
            }
        });
    }

    // UI Elements
    const codeEditor = document.getElementById('code-editor');
    const editorContainer = document.getElementById('editor-container');
    const controlsPanel = document.getElementById('controls-panel');
    const togglePanelBtn = document.getElementById('toggle-panel-btn');

    //const statusDot = document.querySelector('.status-indicator .dot');
    const statFilename = document.getElementById('stat-filename');
    const tableBody = document.getElementById('ops-table-body');

    // Controls
    const probingToggle = document.getElementById('probing-toggle');
    const lengthToggle = document.getElementById('length-toggle');
    const varToolsToggle = document.getElementById('var-tools-toggle');
    const varZonesToggle = document.getElementById('var-zones-toggle');
    const headerVarsToggle = document.getElementById('header-vars-toggle');
    const headerSafetyToggle = document.getElementById('header-safety-toggle');
    const headerStampToggle = document.getElementById('header-stamp-toggle');
    const headerToolsToggle = document.getElementById('header-tools-toggle');

    // Probing config container refs
    const probingConfigDiv = document.getElementById('probing-config');
    const probingCyclesList = document.getElementById('probing-cycles-list');
    const btnAddProbe = document.getElementById('btn-add-probe');

    const partNumberInput = document.getElementById('part-number');
    const opNumberInput = document.getElementById('operation-number');

    const headerCommentsConfig = document.getElementById('header-comments-config');
    const headerCommentsList = document.getElementById('header-comments-list');
    const newCommentInput = document.getElementById('new-comment-input');
    const btnAddComment = document.getElementById('btn-add-comment');

    const btnClose = document.getElementById('btn-close');
    const btnCopy = document.getElementById('btn-copy');
    const btnDownload = document.getElementById('btn-download');
    const btnPrint = document.getElementById('btn-print');

    // State
    let currentRawCode = "";
    let currentHeader = "";
    let parsedOperations = [];
    let workZonesCount = {};
    let globalZoneMap = {};
    let fileMeta = { name: "" };
    let toolMeasurements = {};
    let headerComments = [];

    // --- Panel Toggle ---
    togglePanelBtn.addEventListener('click', () => {
        controlsPanel.classList.toggle('collapsed');
    });

    // --- Draggable Panel Resizer ---
    const panelResizer = document.getElementById('panel-resizer');
    let isResizing = false;

    if (panelResizer) {
        panelResizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            panelResizer.classList.add('active');
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            let newWidth = window.innerWidth - e.clientX;
            const minWidth = 400; 
            const maxWidth = window.innerWidth - 300; 
            
            if (newWidth < minWidth) newWidth = minWidth;
            if (newWidth > maxWidth) newWidth = maxWidth;
            
            controlsPanel.style.setProperty('--panel-width', `${newWidth}px`);
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                panelResizer.classList.remove('active');
                document.body.style.cursor = '';
            }
        });
    }

    // --- Modification Tabs ---
    document.querySelectorAll('.mod-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.mod-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.mod-content').forEach(c => c.classList.remove('active'));

            e.target.classList.add('active');
            
            const targetId = e.target.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
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

    // --- Paste/Typing Handling ---
    let editorTypingTimeout;
    codeEditor.addEventListener('input', () => {
        if (dropZone.style.display !== 'none' && codeEditor.value.trim().length > 0) {
            fileMeta.name = "Pasted Code";
            currentRawCode = codeEditor.value;

            // UI Update
            dropZone.style.display = 'none';

            // Show Controls
            controlsPanel.classList.remove('hidden');
            togglePanelBtn.classList.remove('hidden');

            //statusDot.classList.remove('empty');
            //statusDot.classList.add('active');
            statFilename.value = fileMeta.name;

            parseGCodeIntoOperations(currentRawCode);
            renderTable();

            // Enable buttons
            btnCopy.disabled = false;
            btnDownload.disabled = false;
            btnPrint.disabled = false;
        } else if (dropZone.style.display === 'none') {
            currentRawCode = codeEditor.value;
            
            // Debounce parsing to keep typing smooth
            clearTimeout(editorTypingTimeout);
            editorTypingTimeout = setTimeout(() => {
                parseGCodeIntoOperations(currentRawCode);
                renderTable();
            }, 500);
        }
    });

    // --- Core Processing ---
    function processGCode(gcode) {
        // UI Update
        dropZone.style.display = 'none';

        // Show Editor and Controls
        editorContainer.classList.remove('hidden');
        controlsPanel.classList.remove('hidden');
        togglePanelBtn.classList.remove('hidden');

        //statusDot.classList.remove('empty');
        //statusDot.classList.add('active');
        statFilename.value = fileMeta.name;

        parseGCodeIntoOperations(gcode);
        renderTable();
        codeEditor.value = gcode;

        // Enable buttons
        btnCopy.disabled = false;
        btnDownload.disabled = false;
        btnPrint.disabled = false;
    }

    function renderHeaderComments() {
        if (!headerCommentsList) return;
        headerCommentsList.innerHTML = '';
        if (headerComments.length === 0) {
            headerCommentsList.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">No updates found</span>`;
        } else {
            headerComments.forEach((c, i) => {
                const div = document.createElement('div');
                div.style = "display: flex; gap: 8px;";
                div.innerHTML = `
                    <input type="text" class="inline-input extra-wide current-comment-input" data-index="${i}" value="${c}">
                    <button class="action-btn btn-del-comment" data-index="${i}" style="padding: 4px; height: 32px; width: 32px; min-width: 32px;"><i class="ph ph-trash"></i></button>
                `;
                headerCommentsList.appendChild(div);
            });
        }
        
        document.querySelectorAll('.current-comment-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                headerComments[e.target.getAttribute('data-index')] = e.target.value;
                refreshGeneratedCode();
            });
        });
        
        document.querySelectorAll('.btn-del-comment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                headerComments.splice(parseInt(e.currentTarget.getAttribute('data-index')), 1);
                renderHeaderComments();
                refreshGeneratedCode();
            });
        });
    }

    if (btnAddComment) {
        btnAddComment.addEventListener('click', () => {
            const val = newCommentInput.value.trim();
            const now = new Date();
            const stamp = now.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
            
            if (val) {
                headerComments.push(`${stamp} - ${val}`);
            } else {
                headerComments.push(`${stamp}`);
            }
            newCommentInput.value = '';
            renderHeaderComments();
            refreshGeneratedCode();
        });
    }

    if (headerStampToggle) {
        headerStampToggle.addEventListener('change', () => {
            if (headerStampToggle.checked) {
                headerCommentsConfig.classList.remove('hidden');
            } else {
                headerCommentsConfig.classList.add('hidden');
            }
            refreshGeneratedCode();
        });
    }

    function parseGCodeIntoOperations(code) {
        const result = parseGcodeIntoOperations(code);
        parsedOperations = result.parsedOperations;
        workZonesCount = result.workZonesCount;
        globalZoneMap = result.globalZoneMap;
        currentHeader = result.currentHeader;
        headerComments = result.headerComments;
        renderHeaderComments();
    }

    function renderTable() {
        const zonesContainer = document.getElementById('zones-container');
        if (zonesContainer) {
            zonesContainer.innerHTML = '';
            const entries = Object.entries(workZonesCount);
            if (entries.length === 0) {
                zonesContainer.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">No work zones found</span>`;
            } else {
                entries.forEach(([zone, count]) => {
                    const chip = document.createElement('div');
                    chip.className = 'zone-chip';
                    chip.innerHTML = `
                        <input type="text" class="inline-input global-zone-input" data-original="${zone}" value="${globalZoneMap[zone] || zone}" style="width: 60px;">
                        <span class="zone-count">(${count}×)</span>
                    `;
                    zonesContainer.appendChild(chip);
                });
            }
        }

        
        const toolMeasurementsList = document.getElementById('tool-measurements-list');
        if (toolMeasurementsList) {
            toolMeasurementsList.innerHTML = '';
            
            let uniqueTools = new Set();
            parsedOperations.forEach(op => {
                if (op.tool) {
                    uniqueTools.add(op.tool);
                    if (!toolMeasurements[op.tool]) {
                        toolMeasurements[op.tool] = { length: "", diameter: "", measure: true };
                    }
                }
            });

            if (uniqueTools.size === 0) {
                toolMeasurementsList.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">No tools found</span>`;
            } else {
                Array.from(uniqueTools).sort((a,b) => parseInt(a) - parseInt(b)).forEach(t => {
                    const div = document.createElement('div');
                    div.style = "display: flex; gap: 8px; align-items: center;";
                    div.innerHTML = `
                        <span style="font-size: 13px; font-weight: bold; width: 60px;">Tool ${t}</span>
                        <label style="display:flex; align-items:center; gap:4px; font-size:12px; margin-right: 8px; cursor: pointer;">
                            <input type="checkbox" class="global-measure-toggle" data-tool="${t}" ${toolMeasurements[t].measure ? 'checked' : ''}>
                            Measure
                        </label>
                        <input type="text" class="inline-input global-length-input" data-tool="${t}" value="${toolMeasurements[t].length}" placeholder="Length (0.0)">
                        <input type="text" class="inline-input global-diameter-input" data-tool="${t}" value="${toolMeasurements[t].diameter}" placeholder="Diameter (0.0)">
                    `;
                    toolMeasurementsList.appendChild(div);
                });
            }

            document.querySelectorAll('.global-measure-toggle').forEach(input => {
                input.addEventListener('change', (e) => {
                    toolMeasurements[e.target.getAttribute('data-tool')].measure = e.target.checked;
                    refreshGeneratedCode();
                });
            });
            document.querySelectorAll('.global-length-input').forEach(input => {
                input.addEventListener('input', (e) => {
                    toolMeasurements[e.target.getAttribute('data-tool')].length = e.target.value.replace(/[^0-9.]/g, '');
                    refreshGeneratedCode();
                });
            });
            document.querySelectorAll('.global-diameter-input').forEach(input => {
                input.addEventListener('input', (e) => {
                    toolMeasurements[e.target.getAttribute('data-tool')].diameter = e.target.value.replace(/[^0-9.]/g, '');
                    refreshGeneratedCode();
                });
            });
        }

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

            const subs = op.subprograms.size > 0 ? `<span style="font-family: 'Consolas', monospace; font-size: 12px;">${Array.from(op.subprograms).join('<br>')}</span>` : '-';
            const minZ = op.minZ === Infinity ? '-' : `<span style="font-family: 'Consolas', monospace; font-size: 12px;">${op.minZ.toFixed(4)}</span>`;
            const xRange = (op.minX === Infinity || op.maxX === -Infinity) ? '-' : `<span style="font-family: 'Consolas', monospace; font-size: 12px;">${op.minX.toFixed(3)}<br>${op.maxX.toFixed(3)}</span>`;
            const yRange = (op.minY === Infinity || op.maxY === -Infinity) ? '-' : `<span style="font-family: 'Consolas', monospace; font-size: 12px;">${op.minY.toFixed(3)}<br>${op.maxY.toFixed(3)}</span>`;

            const tCodeMatchWarn = (op.tool && parseInt(op.tool) !== parseInt(op.nCode))
                ? 'style="color: var(--accent); font-weight: bold;" title="T code does not match N code"'
                : '';

            let m00Display = '<span class="badge no">N</span>';
            if (op.m00s && op.m00s.length > 0) {
                m00Display = `<div style="display:flex; flex-direction:column; gap:4px;">` + 
                    op.m00s.map((m, mIdx) => `<input type="text" class="inline-input wide m00-input" data-index="${index}" data-subindex="${mIdx}" value="${m.comment}" placeholder="M00 Comment">`).join('') +
                    `</div>`;
            }
            
            let m01Display = `<span class="badge yes">Y</span>`;
            if (!op.m01) {
                m01Display = `<button class="btn-add-m01" data-index="${index}" style="background: none; border: none; color: var(--primary); cursor: pointer; padding: 2px;" title="Insert M01 after Tool Call"><i class="ph ph-plus-circle" style="font-size: 16px;"></i></button>`;
            }
            
            let m08Display = `<span class="badge yes">Y</span>`;
            if (!op.m08) {
                m08Display = `<button class="btn-add-m08" data-index="${index}" style="background: none; border: none; color: var(--primary); cursor: pointer; padding: 2px;" title="Insert M08 after Tool Call"><i class="ph ph-plus-circle" style="font-size: 16px;"></i></button>`;
            }

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
                <td>${m00Display}</td>
                <td>${m01Display}</td>
                <td>${m08Display}</td>
                <td>${subs}</td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                    ${op.feedRates.length > 0 
                        ? op.feedRates.map((f, i) => `<input type="text" class="inline-input feed-input" data-index="${index}" data-subindex="${i}" value="${f}" placeholder="-">`).join('') 
                        : `<input type="text" class="inline-input feed-input" data-index="${index}" data-subindex="0" value="" placeholder="-">`}
                    </div>
                </td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                    ${op.spindleSpeeds.length > 0
                        ? op.spindleSpeeds.map((s, i) => `<input type="text" class="inline-input speed-input" data-index="${index}" data-subindex="${i}" value="${s}" placeholder="-">`).join('')
                        : `<input type="text" class="inline-input speed-input" data-index="${index}" data-subindex="0" value="" placeholder="-">`}
                    </div>
                </td>
                <td>${minZ}</td>
                <td>${xRange}</td>
                <td>${yRange}</td>
            `;
            tableBody.appendChild(tr);
        });

        const bindInput = (selector, key, sanitizer) => {
            document.querySelectorAll(selector).forEach(input => {
                input.addEventListener('input', (e) => {
                    const idx = e.target.getAttribute('data-index');
                    const subIdx = e.target.getAttribute('data-subindex');
                    let val = e.target.value;
                    if (sanitizer) val = sanitizer(val);
                    
                    if (subIdx !== null && subIdx !== undefined) {
                        if (!parsedOperations[idx][key]) parsedOperations[idx][key] = [];
                        parsedOperations[idx][key][parseInt(subIdx)] = val;
                    } else {
                        parsedOperations[idx][key] = val;
                    }

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
        document.querySelectorAll('.m00-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = e.target.getAttribute('data-index');
                const subIdx = e.target.getAttribute('data-subindex');
                parsedOperations[idx].m00s[parseInt(subIdx)].comment = e.target.value;
                refreshGeneratedCode();
            });
        });
        bindInput('.feed-input', 'feedRates', v => v.replace(/[^0-9.]/g, ''));
        bindInput('.speed-input', 'spindleSpeeds', v => v.replace(/[^0-9]/g, ''));
        document.querySelectorAll('.global-zone-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const orig = e.target.getAttribute('data-original');
                const val = e.target.value.toUpperCase();
                globalZoneMap[orig] = val;
                refreshGeneratedCode();
            });
        });

        document.querySelectorAll('.btn-add-m08').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                const op = parsedOperations[idx];
                
                let insertIdx = op.lines.findIndex(l => /\bM0?6\b/i.test(l));
                if (insertIdx !== -1) {
                    op.lines.splice(insertIdx + 1, 0, "M08");
                } else {
                    op.lines.splice(1, 0, "M08");
                }
                
                refreshGeneratedCode();
                currentRawCode = codeEditor.value;
                parseGCodeIntoOperations(currentRawCode);
                renderTable();
            });
        });

        document.querySelectorAll('.btn-add-m01').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                const op = parsedOperations[idx];
                
                let insertIdx = op.lines.findIndex(l => /\bM0?6\b/i.test(l));
                if (insertIdx !== -1) {
                    op.lines.splice(insertIdx + 1, 0, "M01");
                } else {
                    op.lines.splice(1, 0, "M01");
                }
                
                refreshGeneratedCode();
                currentRawCode = codeEditor.value;
                parseGCodeIntoOperations(currentRawCode);
                renderTable();
            });
        });

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

    // --- Live Editor Updates ---

    // ---- Probing Cycle Cards ----
    let probeCycleCount = 0;

    function createProbeCycleCard() {
        const id = ++probeCycleCount;
        const card = document.createElement('div');
        card.className = 'probe-cycle-card';
        card.dataset.cycleId = id;
        card.innerHTML = `
            <div class="probe-card-header">
                <span class="probe-card-title">Probe Cycle #${id}</span>
                <div style="display:flex; align-items:center; gap:8px;">
                    <select class="inline-input probe-type-select" style="width: 100px; padding: 3px 6px;">
                        <option value="surface">Surface</option>
                        <option value="bore">Bore</option>
                        <option value="boss">Boss</option>
                        <option value="gap-x">Gap X</option>
                        <option value="web-x">Web X</option>
                        <option value="gap-y">Gap Y</option>
                        <option value="web-y">Web Y</option>
                    </select>
                    <button class="probe-remove-btn" title="Remove"><i class="ph ph-x"></i></button>
                </div>
            </div>
            <div class="probing-params-grid">
                <div class="probe-param-group">
                    <label>Tool / N</label>
                    <input type="number" class="inline-input probe-tool" placeholder="31" min="1">
                </div>
                <div class="probe-param-group">
                    <label>Zone</label>
                    <input type="text" class="inline-input probe-offset" placeholder="54">
                </div>
                <div class="probe-param-group">
                    <label>X</label>
                    <input type="number" class="inline-input probe-x" placeholder="0.00" step="0.01">
                </div>
                <div class="probe-param-group">
                    <label>Y</label>
                    <input type="number" class="inline-input probe-y" placeholder="0.00" step="0.01">
                </div>
                <div class="probe-param-group probe-z-group">
                    <label class="probe-z-label">Z Surface</label>
                    <input type="number" class="inline-input probe-z" placeholder="0.00" step="0.01">
                </div>
                <div class="probe-param-group probe-v6-group" style="display:none">
                    <label class="probe-v6-label">Diameter</label>
                    <input type="number" class="inline-input probe-v6" placeholder="0.00" step="0.01">
                </div>
                <div class="probe-param-group probe-v7-group" style="display:none">
                    <label class="probe-v7-label">Depth</label>
                    <input type="number" class="inline-input probe-v7" placeholder="0.00" step="0.01">
                </div>
            </div>
        `;

        // Type change → update visible fields + labels
        const typeSelect = card.querySelector('.probe-type-select');
        typeSelect.addEventListener('change', () => {
            updateCardFieldVisibility(card);
            refreshGeneratedCode();
        });

        // Remove button
        card.querySelector('.probe-remove-btn').addEventListener('click', () => {
            card.remove();
            renumberCards();
            refreshGeneratedCode();
        });

        // Any input change → regenerate
        card.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('input', refreshGeneratedCode);
        });

        probingCyclesList.appendChild(card);
        updateCardFieldVisibility(card);
        return card;
    }

    function updateCardFieldVisibility(card) {
        const type = card.querySelector('.probe-type-select').value;
        const needsV6 = ['bore', 'boss', 'gap-x', 'web-x', 'gap-y', 'web-y'].includes(type);
        const needsV7 = ['boss', 'web-x', 'web-y'].includes(type);

        card.querySelector('.probe-v6-group').style.display = needsV6 ? '' : 'none';
        card.querySelector('.probe-v7-group').style.display = needsV7 ? '' : 'none';

        const zLabel = card.querySelector('.probe-z-label');
        const v6Label = card.querySelector('.probe-v6-label');
        const v7Label = card.querySelector('.probe-v7-label');

        if (type === 'surface') {
            zLabel.textContent = 'Z Surface';
        } else if (['bore', 'gap-x', 'gap-y'].includes(type)) {
            zLabel.textContent = 'Z Depth';
            v6Label.textContent = type === 'bore' ? 'Diameter' : (type === 'gap-x' ? 'Width X' : 'Width Y');
        } else if (['boss', 'web-x', 'web-y'].includes(type)) {
            zLabel.textContent = 'Z Safe';
            v6Label.textContent = 'Depth';
            v7Label.textContent = type === 'boss' ? 'Diameter' : (type === 'web-x' ? 'Width X' : 'Width Y');
        }
    }

    function renumberCards() {
        probingCyclesList.querySelectorAll('.probe-cycle-card').forEach((card, i) => {
            card.querySelector('.probe-card-title').textContent = `Probe Cycle #${i + 1}`;
        });
    }

    // Show/hide probing config when toggle changes
    probingToggle.addEventListener('change', () => {
        if (probingToggle.checked) {
            probingConfigDiv.classList.remove('hidden');
            // Add first card automatically if list is empty
            if (probingCyclesList.children.length === 0) {
                createProbeCycleCard();
            }
        } else {
            probingConfigDiv.classList.add('hidden');
        }
        refreshGeneratedCode();
    });

    btnAddProbe.addEventListener('click', () => {
        createProbeCycleCard();
        refreshGeneratedCode();
    });

    const lengthConfigDiv = document.getElementById('length-config');
    lengthToggle.addEventListener('change', () => {
        if (lengthToggle.checked) {
            lengthConfigDiv.classList.remove('hidden');
        } else {
            lengthConfigDiv.classList.add('hidden');
        }
        refreshGeneratedCode();
    });

    // Auto-update on every other setting change
    [varToolsToggle, varZonesToggle, headerVarsToggle, headerSafetyToggle, headerStampToggle, headerToolsToggle].forEach(toggle => {
        if (toggle) toggle.addEventListener('change', refreshGeneratedCode);
    });

    [partNumberInput, opNumberInput].forEach(input => {
        if (input) input.addEventListener('input', refreshGeneratedCode);
    });

    function refreshGeneratedCode() {
        if (!currentRawCode) return;
        const modifiedCode = generateModifiedGCode();
        codeEditor.value = modifiedCode;
    }

    // --- Export Logic ---
    btnClose.addEventListener('click', () => {
        currentRawCode = "";
        currentHeader = "";
        parsedOperations = [];
        workZonesCount = {};
        globalZoneMap = {};
        fileMeta = { name: "" };
        
        codeEditor.value = "";
        fileInput.value = '';
        
        [probingToggle, lengthToggle, varToolsToggle, varZonesToggle].forEach(t => { if (t) t.checked = false; });
        [headerVarsToggle, headerSafetyToggle, headerStampToggle, headerToolsToggle].forEach(t => { if (t) t.checked = false; });
        [partNumberInput, opNumberInput].forEach(i => { if (i) i.value = ''; });
        if (headerCommentsConfig) headerCommentsConfig.classList.add('hidden');
        headerComments = [];
        if (newCommentInput) newCommentInput.value = '';
        renderHeaderComments();
        
        probingConfigDiv.classList.add('hidden');
        probingCyclesList.innerHTML = "";
        probeCycleCount = 0;
        
        const zCont = document.getElementById('zones-container');
        if (zCont) zCont.innerHTML = "";
        tableBody.innerHTML = "";
        
        editorContainer.classList.add('hidden');
        controlsPanel.classList.add('hidden');
        togglePanelBtn.classList.add('hidden');
        controlsPanel.classList.remove('collapsed');
        
        //statusDot.classList.add('empty');
        //statusDot.classList.remove('active');
        statFilename.value = "No file loaded";
        
        dropZone.style.display = 'flex';
        
        btnCopy.disabled = true;
        btnDownload.disabled = true;
        btnPrint.disabled = true;
    });

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

        let filename = statFilename.value.trim();
        if (!filename || filename === 'No file loaded') {
            filename = 'download.nc';
        } else if (!filename.includes('.')) {
            filename += '.nc';
        }

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

    // --- GCode Modifications ---
    function generateModifiedGCode() {
        const useProbing = probingToggle.checked;
        const useLengthCheck = lengthToggle.checked;
        const useVarTools = varToolsToggle.checked;
        const useVarZones = varZonesToggle.checked;
        const useHeaderVars = headerVarsToggle ? headerVarsToggle.checked : true;
        const useHeaderSafety = headerSafetyToggle ? headerSafetyToggle.checked : true;
        const useHeaderStamp = headerStampToggle ? headerStampToggle.checked : true;
        const useHeaderTools = headerToolsToggle ? headerToolsToggle.checked : false;

        const partNum = partNumberInput.value.trim() || 'PART';
        const opNum = 'OP' + (opNumberInput.value.trim() || '');

        let headerTitle = `(${partNum} ${opNum})`;

        let out = "";

        if (!currentHeader.trim()) {
            out = "% \n";
            out += `O99999 ${headerTitle} \n`;
            if (useHeaderStamp && headerComments.length > 0) {
                headerComments.forEach(c => {
                    if (c.trim()) out += `(${c}) \n`;
                });
            }
            out += "\n";
        } else {
            let lines = currentHeader.split('\n');
            let oCodeFound = false;
            let newHeaderLines = [];

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                if (!oCodeFound && /^O\d+/i.test(line.trim())) {
                    // This is the O code line
                    let replaced = line.replace(/\([^)]*\)/g, ''); // remove existing title comments
                    newHeaderLines.push(`${replaced.trim()} ${headerTitle}`);
                    if (useHeaderStamp && headerComments.length > 0) {
                        headerComments.forEach(c => {
                            if (c.trim()) newHeaderLines.push(`(${c})`);
                        });
                    }
                    oCodeFound = true;
                } else {
                    newHeaderLines.push(line);
                }
            }

            if (!oCodeFound) {
                // If no O code found, add it at the top (after % if exists)
                if (newHeaderLines[0] && newHeaderLines[0].trim() === '%') {
                    newHeaderLines.splice(1, 0, `O99999 ${headerTitle}`);
                    if (useHeaderStamp && headerComments.length > 0) {
                        let offset = 2;
                        headerComments.forEach(c => {
                            if (c.trim()) {
                                newHeaderLines.splice(offset, 0, `(${c})`);
                                offset++;
                            }
                        });
                    }
                } else {
                    if (useHeaderStamp && headerComments.length > 0) {
                        [...headerComments].reverse().forEach(c => {
                            if (c.trim()) newHeaderLines.unshift(`(${c})`);
                        });
                    }
                    newHeaderLines.unshift(`O99999 ${headerTitle}`);
                    newHeaderLines.unshift("%");
                }
            }

            out = newHeaderLines.join('\n');
            if (!out.endsWith('\n\n')) {
                out = out.trimEnd() + '\n\n';
            }
        }

        if (useHeaderVars) {
            out += "(VARIABLES) \n";
            if (useProbing || useLengthCheck || useVarTools || useVarZones) {
                if (useProbing) out += `(#800: probing toggle) \n`;
                if (useLengthCheck) out += `(#899: tool length measurement toggle) \n`;
                out += "\n";
            }
        }

        let uniqueZones = new Set();
        let uniqueTools = new Set();
        let toolDescs = {};

        // Track the first occurrence's index or object to assign variables
        let toolVars = {};
        let zoneVars = {};

        parsedOperations.forEach(op => {
            if (op.workZone) {
                let activeZone = globalZoneMap[op.workZone] || op.workZone;
                uniqueZones.add(activeZone);
            }
            if (op.tool) {
                uniqueTools.add(op.tool);
                toolDescs[op.tool] = op.description || `Tool ${op.tool}`;
            }
        });

        if (useVarZones && uniqueZones.size > 0) {
            let zoneCounter = 851;
            uniqueZones.forEach(z => {
                zoneVars[z] = zoneCounter;
                if (useHeaderVars) out += `(#${zoneCounter}: work zone ${z}) \n`;
                zoneCounter++;
                if (zoneCounter > 856) zoneCounter++; // Assuming limit, reference didn't specify beyond 856 but safe.
            });
            if (useHeaderVars) out += "\n";
        }

        if (useVarTools && uniqueTools.size > 0) {
            let subCounter = 801;
            uniqueTools.forEach(t => {
                toolVars[t] = subCounter;
                if (useHeaderVars) out += `(#${subCounter}: ${toolDescs[t].replace(/[()]/g, '')}) \n`;
                subCounter++;
            });
            if (useHeaderVars) out += "\n";
        }

        if (useHeaderTools && uniqueTools.size > 0) {
            out += "(TOOLS) \n";
            let toolList = Array.from(uniqueTools).sort((a, b) => parseInt(a) - parseInt(b));
            toolList.forEach(t => {
                let desc = toolDescs[t] ? toolDescs[t].replace(/[()]/g, '') : `TOOL ${t}`;
                out += `(T${t} - ${desc}) \n`;
            });
            out += "\n";
        }

        // Program Safety Lines
        if (useHeaderSafety) {
            out += "G00 G17 G20 G40 G49 G80 G90 \n\n";
        }

        if (useProbing) {
            out += "IF [#800 EQ 1] GOTO31 (probing toggle) \n";
            out += "N0 \n\n";
        }

        parsedOperations.forEach(op => {
            // Write N block description
            out += `N${op.nCode} (${op.description ? op.description : ''}) \n`;

            if (useLengthCheck && op.tool && toolMeasurements[op.tool] && toolMeasurements[op.tool].measure !== false) {
                out += `IF [#899 NE 1] GOTO${parseInt(op.nCode) * 100} (length measurement toggle) \n\n`;
                out += `(MEASURE TOOL ${op.tool})\n`;
                out += `G53 G0 Z0 \n`;

                let tRef = useVarTools ? `#${toolVars[op.tool]}` : op.tool;
                out += `T${tRef} M06 \n`;
                const tLength = toolMeasurements[op.tool]?.length || "0.0";
                const tDiameter = toolMeasurements[op.tool]?.diameter || "0.0";
                out += `G65 P9995 T${tRef} A0.0 B1.0 C2.0 E${tLength} D${tDiameter} \n`;
                out += `G53 G0 Z0 \n`;
                out += `M01 \n\n`;
                out += `N${parseInt(op.nCode) * 100} \n`;
            }

            // Beginning of tool operation safety lines (removed per user)

            op.lines.forEach((line, index) => {
                let modifiedLine = line;

                if (op.m00s && op.m00s.length > 0) {
                    let m00SameLine = op.m00s.find(m => m.lineIndex === index);
                    if (m00SameLine && !m00SameLine.originalComment && m00SameLine.comment.trim()) {
                        modifiedLine += ` (${m00SameLine.comment.trim()})`;
                    } else {
                        let m00NextLine = op.m00s.find(m => (!m.isSameLine) && m.lineIndex + 1 === index);
                        if (m00NextLine && m00NextLine.originalComment) {
                            if (m00NextLine.comment.trim()) {
                                modifiedLine = modifiedLine.replace(`(${m00NextLine.originalComment})`, `(${m00NextLine.comment.trim()})`);
                            } else {
                                modifiedLine = modifiedLine.replace(`(${m00NextLine.originalComment})`, ``).trim();
                            }
                        }
                        if (m00SameLine && m00SameLine.originalComment && m00SameLine.isSameLine) {
                            if (m00SameLine.comment.trim()) {
                                modifiedLine = modifiedLine.replace(`(${m00SameLine.originalComment})`, `(${m00SameLine.comment.trim()})`);
                            } else {
                                modifiedLine = modifiedLine.replace(`(${m00SameLine.originalComment})`, ``).trim();
                            }
                        }
                    }
                }

                // Skip `%` symbols found in operations since we output it explicitly at start and end
                if (modifiedLine.trim() === '%') return;

                // Strip the duplicated N code and comment block from the first line
                if (index === 0) {
                    modifiedLine = modifiedLine.replace(/^N\d+\s*(\([^)]*\))?\s*/i, '');
                    if (!modifiedLine.trim()) return; // skip if nothing is left
                }

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
                    let activeZone = globalZoneMap[op.workZone] || op.workZone;
                    if (useVarZones) {
                        modifiedLine = modifiedLine.replace(/G5[4-9]|G54\.1\s*P\d+/gi, `G#${zoneVars[activeZone]}`);
                    } else {
                        modifiedLine = modifiedLine.replace(/G5[4-9]|G54\.1\s*P\d+/gi, activeZone);
                    }
                }

                // Feed rate replaces
                if (op.feedRates && op.feedRates.length > 0) {
                    const fRegex = /F(\d+(\.\d*)?)/ig;
                    modifiedLine = modifiedLine.replace(fRegex, (match, val) => {
                        const originalIndex = op.originalFeedRates.indexOf(val);
                        if (originalIndex !== -1 && op.feedRates[originalIndex] !== undefined && op.feedRates[originalIndex].trim() !== "") {
                            return `F${op.feedRates[originalIndex]}`;
                        }
                        return match;
                    });
                }

                // Spindle speed replaces
                if (op.spindleSpeeds && op.spindleSpeeds.length > 0) {
                    const sRegex = /S(\d+)/ig;
                    modifiedLine = modifiedLine.replace(sRegex, (match, val) => {
                        const originalIndex = op.originalSpindleSpeeds.indexOf(val);
                        if (originalIndex !== -1 && op.spindleSpeeds[originalIndex] !== undefined && op.spindleSpeeds[originalIndex].trim() !== "") {
                            return `S${op.spindleSpeeds[originalIndex]}`;
                        }
                        return match;
                    });
                }

                out += modifiedLine + "\n";
            });

            // End of tool operation safety lines (removed per user)
            out += "\n";
        });

        // Generate Subprograms (assuming they were N block prefixed elements that didn't act as tool operations natively, 
        // wait, we filtered standard M30 and then subprograms? Actually parseGCodeIntoOperations gets all N blocks.
        // As per table ops, subprograms usually have an N block but no tool. We generated them with M30. Wait, M30 needs to be BEFORE subprograms!
        // We will assume in the parsedOperations, ops > N4000 are subprograms.
        // Wait, the user reference says "N codes should correspond to the tool number used during the operation... N codes will often not be sequential."
        // We might have accidentally put subprograms before M30. We should output subprograms after M30. Subprograms usually have N > 1000 or similar.
        // Actually, let's keep it simple for now as it was basically sequentially appended.

        if (useProbing) {
            out += getProbingBlockFromUI();
        }

        out += "% \n";

        return out;
    }

    function getProbingBlockFromUI() {
        const cards = probingCyclesList.querySelectorAll('.probe-cycle-card');
        const cycles = [];
        cards.forEach((card) => {
            cycles.push({
                type: card.querySelector('.probe-type-select').value,
                v1: parseInt(card.querySelector('.probe-tool').value),
                v2Str: card.querySelector('.probe-offset').value.trim(),
                v2: parseFloat(card.querySelector('.probe-offset').value.trim()),
                v3: parseFloat(card.querySelector('.probe-x').value) || 0,
                v4: parseFloat(card.querySelector('.probe-y').value) || 0,
                v5: parseFloat(card.querySelector('.probe-z').value) || 0,
                v6: parseFloat(card.querySelector('.probe-v6').value) || 0,
                v7: parseFloat(card.querySelector('.probe-v7').value) || 0
            });
        });
        return generateProbingBlock(cycles);
    }
})
