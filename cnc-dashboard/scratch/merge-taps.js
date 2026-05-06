import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../dashboard-data.js');

// Read the file content
let content = fs.readFileSync(dataPath, 'utf8');

// Extract the dashboardData object
const match = content.match(/const dashboardData = (\{[\s\S]*?\});\s*export default dashboardData;/);
if (!match) {
    console.error('Could not find dashboardData object');
    process.exit(1);
}

let dashboardData;
try {
    // using eval to parse the object literal
    eval(`dashboardData = ${match[1]}`);
} catch (e) {
    console.error('Error parsing dashboardData:', e);
    process.exit(1);
}

const tapSizes = dashboardData.tapSizes;
const metricThreads = dashboardData.metricThreads;
const unifiedThreads = dashboardData.unifiedThreads;

// Helper to normalize tap sizes for matching
function normalizeSize(size) {
    return size.replace(/–/g, '-')
               .replace(/\s+/g, '')
               .replace('#', '')
               .replace(/"/g, '')
               .toLowerCase();
}

function matchThread(tapSizeStr) {
    const normTap = normalizeSize(tapSizeStr);
    
    // First try to match metric
    if (normTap.startsWith('m')) {
        // e.g. "m1.6x0.35" -> "m1.6" (for coarse) or "m8x1"
        for (let mt of metricThreads) {
            let normMt = normalizeSize(mt.size);
            // If the tap has a pitch, but the metric thread is coarse (no pitch in name), we should check if they match base diameter.
            // But sometimes the metric thread name has 'x' (fine).
            if (normTap === normMt || normTap.startsWith(normMt + 'x')) {
                return mt;
            }
        }
    } else {
        // Unified
        for (let ut of unifiedThreads) {
            let normUt = normalizeSize(ut.size);
            if (normUt === normTap) {
                // Return the first match (class 1, 2, or 3 doesn't matter for the pilot drill usually, or we just put the pilot drill in the first matching one, or all of them)
                // Actually, let's put it in all matching classes!
                // We'll return an array of matches for unified
            }
        }
    }
    return null;
}

let unmatched = [];

tapSizes.forEach(tap => {
    const normTap = normalizeSize(tap.size);
    let matched = false;
    
    if (normTap.startsWith('m')) {
        for (let mt of metricThreads) {
            let normMt = normalizeSize(mt.size);
            if (normTap === normMt || normTap.startsWith(normMt + 'x')) {
                mt.pilotDiaCut = tap.pilotDiaCut;
                mt.pilotDiaCutDecimalIn = tap.pilotDiaCutDecimalIn;
                mt.pilotDiaCutDecimalMm = tap.pilotDiaCutDecimalMm;
                mt.pilotDiaForm = tap.pilotDiaForm;
                mt.pilotDiaFormDecimalIn = tap.pilotDiaFormDecimalIn;
                mt.pilotDiaFormDecimalMm = tap.pilotDiaFormDecimalMm;
                matched = true;
            }
        }
    } else {
        for (let ut of unifiedThreads) {
            let normUt = normalizeSize(ut.size);
            // Since tap sizes are like "1/4-20unc", normTap = "1/4-20unc"
            // unified size "1/4-20 UNC", normUt = "1/4-20unc"
            if (normUt === normTap) {
                ut.pilotDiaCut = tap.pilotDiaCut;
                ut.pilotDiaCutDecimalIn = tap.pilotDiaCutDecimalIn;
                ut.pilotDiaCutDecimalMm = tap.pilotDiaCutDecimalMm;
                ut.pilotDiaForm = tap.pilotDiaForm;
                ut.pilotDiaFormDecimalIn = tap.pilotDiaFormDecimalIn;
                ut.pilotDiaFormDecimalMm = tap.pilotDiaFormDecimalMm;
                matched = true;
            }
        }
    }
    
    if (!matched) {
        unmatched.push(tap.size);
    }
});

console.log('Unmatched taps:', unmatched);

// Remove tapSizes from dashboardData
delete dashboardData.tapSizes;

// Re-stringify and write back
const newContent = `const dashboardData = ${JSON.stringify(dashboardData, null, 4)};\n\nexport default dashboardData;\n`;
fs.writeFileSync(dataPath, newContent);
console.log('Successfully updated dashboard-data.js');
