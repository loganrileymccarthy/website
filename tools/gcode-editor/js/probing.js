import { insertBlockAfterHeader } from './operations.js';

export function probeDecider() {
    const select = document.getElementById('probingSelect');
    const value = select.value;
    
    let config = { type: value };
    
    switch(value) {
        case 'surface': config.prefix = 'nb1'; config.count = 5; break;
        case 'bore':    config.prefix = 'nb2'; config.count = 6; break;
        case 'boss':    config.prefix = 'nb3'; config.count = 7; break;
        case 'gap-x':   config.prefix = 'nb4'; config.count = 6; break;
        case 'web-x':   config.prefix = 'nb5'; config.count = 7; break;
        case 'gap-y':   config.prefix = 'nb6'; config.count = 6; break;
        case 'web-y':   config.prefix = 'nb7'; config.count = 7; break;
        default: return;
    }
    
    addProbeGeneric(config);
}

export function addProbeGeneric(config) {
    const textArea = document.getElementById('textInput');
    
    // Get input values
    const values = [];
    for (let i = 1; i <= config.count; i++) {
        const id = `${config.prefix}.${i}`;
        const el = document.getElementById(id);
        if (!el) {
            console.error(`Element ${id} not found`);
            return;
        }
        const val = (i === 1) ? parseInt(el.value) : parseFloat(el.value);
        if (isNaN(val)) {
            alert('Please enter parameters.');
            return;
        }
        values.push(val);
    }

    // Map values for clarity
    // v1: Tool/N, v2: Work Offset, v3: X, v4: Y, v5: Z, v6: Width/Dia(internal) or Depth(external), v7: Width/Dia(external)
    const v1 = values[0]; // N/Tool
    const v2 = values[1]; // Offset
    const v3 = values[2]; // X
    const v4 = values[3]; // Y
    const v5 = values[4]; // Z
    const v6 = values[5]; // varies
    const v7 = values[6]; // varies

    // Handle zone number syntax
    let sVal = v2;
    let zoneVal = v2;

    const v2Str = document.getElementById(`${config.prefix}.2`).value;
    // Strict 2-decimal check for 154 range
    if (v2 >= 154 && v2 < 155) {
        if (!/^\d+\.\d{2}$/.test(v2Str)) {
            alert('Invalid zone number. For 154 range, you must use 2 decimal places (e.g. 154.01).');
            return;
        }
    }

    if (54 <= v2 && v2 < 60) {
        sVal = v2 - 53;
    } else if (154.01 <= v2 && v2 < 155) {
        const parts = v2Str.split(".");
        const integerPart = parseInt(parts[0]);
        const decimalPart = parseInt(parts[1]);
        zoneVal = integerPart + " P" + decimalPart;
    } else {
        alert('Invalid zone number. Must be 54-59 or 154.01-154.99');
        return;
    }

    // Determine Z heights and Macro Logic
    let safeZ = v5 + 3.0; // Retract height
    let approachZ;
    let macroLine;

    const type = config.type;
    const isExternal = ['surface', 'boss', 'web-x', 'web-y'].includes(type);
    
    // Approach Z calculation
    if (isExternal) {
        approachZ = v5 + 0.1;
    } else {
        // bore, gap-x, gap-y
        approachZ = v5;
    }

    // Macro Line calculation
    if (type === 'surface') {
        macroLine = `G65 P9811 Z${v5.toFixed(2)} S${sVal}`;
    } else if (type === 'bore') {
        macroLine = `G65 P9814 D${v6.toFixed(2)} S${sVal}`;
    } else if (type === 'boss') {
        macroLine = `G65 P9814 D${v7.toFixed(2)} Z-${Math.abs(v6).toFixed(2)} S${sVal}`;
    } else if (type === 'gap-x') {
        macroLine = `G65 P9812 X${v6.toFixed(2)} S${sVal}`;
    } else if (type === 'web-x') {
        macroLine = `G65 P9812 X${v7.toFixed(2)} Z-${Math.abs(v6).toFixed(2)} S${sVal}`;
    } else if (type === 'gap-y') {
        macroLine = `G65 P9812 Y${v6.toFixed(2)} S${sVal}`;
    } else if (type === 'web-y') {
        macroLine = `G65 P9812 Y${v7.toFixed(2)} Z-${Math.abs(v6).toFixed(2)} S${sVal}`;
    }

    // Construct the block
    const lines = [];
    lines.push("G0 G17 G20 G40 G49 G80 G90");
    lines.push("");
    lines.push("N" + v1 + " (PROBE)");
    lines.push('T' + v1 + " M6");
    lines.push("G00 G90 G" + zoneVal + " X" + v3.toFixed(2) + " Y" + v4.toFixed(2));
    lines.push("G43 H"+ v1 + " Z" + safeZ.toFixed(2));
    lines.push("G65 P9832");
    lines.push("G65 P9810 Z" + approachZ.toFixed(2) + " F100.");
    lines.push(macroLine);
    lines.push("G65 P9833");
    lines.push("G00 Z" + safeZ.toFixed(2));
    lines.push("G53 Z0");
    lines.push("");
    
    const blockContent = lines.join('\n');
    insertBlockAfterHeader(blockContent);
}

export function updateProbingVisibility() {
    const type = document.getElementById('probingSelect').value;
    // Since we are toggling divs that contain .form-group (which is flex), 
    // set display to block (or inherit) for the container div. 
    // The internal .form-group will handle the flex layout.
    document.getElementById('probing-surface').style.display = (type === 'surface') ? 'block' : 'none';
    document.getElementById('probing-bore').style.display = (type === 'bore') ? 'block' : 'none';
    document.getElementById('probing-boss').style.display = (type === 'boss') ? 'block' : 'none';
    document.getElementById('probing-gap-x').style.display = (type === 'gap-x') ? 'block' : 'none';
    document.getElementById('probing-web-x').style.display = (type === 'web-x') ? 'block' : 'none';
    document.getElementById('probing-gap-y').style.display = (type === 'gap-y') ? 'block' : 'none';
    document.getElementById('probing-web-y').style.display = (type === 'web-y') ? 'block' : 'none';
}

// Attach to window
window.probeDecider = probeDecider;
window.addProbeGeneric = addProbeGeneric;
window.updateProbingVisibility = updateProbingVisibility;
