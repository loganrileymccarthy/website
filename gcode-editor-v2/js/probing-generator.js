function generateProbingBlock(cycles) {
    if (!cycles || cycles.length === 0) return '(PROBING: no probe cycles configured)\n\n';

    let out = '';
    cycles.forEach((cycle, cardIdx) => {
        const type = cycle.type;
        const v1 = cycle.v1;
        const v2Str = cycle.v2Str;
        const v2 = cycle.v2;
        const v3 = cycle.v3 || 0;
        const v4 = cycle.v4 || 0;
        const v5 = cycle.v5 || 0;
        const v6 = cycle.v6 || 0;
        const v7 = cycle.v7 || 0;

        if (isNaN(v1) || isNaN(v2) || v2Str === '') {
            out += `(PROBE CYCLE ${cardIdx + 1}: enter Tool/N and Work Offset to generate)\n\n`;
            return;
        }

        // Work offset → S-value and G-code zone string
        let sVal, zoneVal;
        if (v2 >= 54 && v2 < 60) {
            sVal = v2 - 53;
            zoneVal = `G${v2}`;
        } else if (v2 >= 154.01 && v2 < 155) {
            const parts = v2Str.split('.');
            if (!parts[1] || parts[1].length !== 2) {
                out += `(PROBE CYCLE ${cardIdx + 1}: 154 range offset needs 2 decimal places e.g. 154.01)\n\n`;
                return;
            }
            sVal = parseInt(parts[1]);
            zoneVal = `G154 P${sVal}`;
        } else {
            out += `(PROBE CYCLE ${cardIdx + 1}: invalid offset — must be 54–59 or 154.01–154.99)\n\n`;
            return;
        }

        const isExternal = ['surface', 'boss', 'web-x', 'web-y'].includes(type);
        const safeZ = v5 + 3.0;
        const approachZ = isExternal ? v5 + 0.1 : v5;

        let macroLine = '';
        if (type === 'surface')   macroLine = `G65 P9811 Z${v5.toFixed(2)} S${sVal}`;
        else if (type === 'bore') macroLine = `G65 P9814 D${v6.toFixed(2)} S${sVal}`;
        else if (type === 'boss') macroLine = `G65 P9814 D${v7.toFixed(2)} Z-${Math.abs(v6).toFixed(2)} S${sVal}`;
        else if (type === 'gap-x') macroLine = `G65 P9812 X${v6.toFixed(2)} S${sVal}`;
        else if (type === 'web-x') macroLine = `G65 P9812 X${v7.toFixed(2)} Z-${Math.abs(v6).toFixed(2)} S${sVal}`;
        else if (type === 'gap-y') macroLine = `G65 P9812 Y${v6.toFixed(2)} S${sVal}`;
        else if (type === 'web-y') macroLine = `G65 P9812 Y${v7.toFixed(2)} Z-${Math.abs(v6).toFixed(2)} S${sVal}`;

        out += `(${type.toUpperCase()} PROBE)\n`;
        out += `T${v1} M06\n`;
        out += `G00 G90 ${zoneVal} X${v3.toFixed(2)} Y${v4.toFixed(2)}\n`;
        out += `G43 H${v1} Z${safeZ.toFixed(2)}\n`;
        out += `G65 P9832\n`;
        out += `G65 P9810 Z${approachZ.toFixed(2)} F100.\n`;
        out += `${macroLine}\n`;
        out += `G65 P9833\n`;
        out += `G00 Z${safeZ.toFixed(2)}\n`;
        out += `G53 Z0\n\n`;
    });

    // Wrap all cycles in N31 block with GOTO0 at end
    return `(*** BEGIN_PROBE_CYCLES ***)\nN31\n${out}GOTO0\n(*** END_PROBE_CYCLES ***)\n\n`;
}

// Export for module usage if necessary in other projects
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateProbingBlock };
}
