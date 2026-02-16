export function copyToClipboard() {
    const outputText = document.getElementById('textInput');
    outputText.select();
    document.execCommand('copy');

    const btn = event.target;
    // Store original text if not already stored
    if (!btn.dataset.originalText) {
        btn.dataset.originalText = btn.textContent;
    }
    const originalText = btn.dataset.originalText;
    
    btn.textContent = 'Copied!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}

export function jumpToCode(index) {
    const textArea = document.getElementById('textInput');
    
    // Set cursor position
    textArea.setSelectionRange(index, index);
    textArea.focus();
}

export function printTable() {
    const table = document.getElementById('operationsTable');
    if (!table) return;

    // Clone the table to avoid modifying the displayed one
    const tableClone = table.cloneNode(true);
    
    // The clone does not copy user-entered values in inputs. We need to copy them manually.
    const originalInputs = table.querySelectorAll('input');
    const cloneInputs = tableClone.querySelectorAll('input');
    
    for (let i = 0; i < originalInputs.length; i++) {
        if (cloneInputs[i]) {
            cloneInputs[i].value = originalInputs[i].value;
        }
    }

    // Replace inputs with simple text/spans in the clone for printing
    const finalInputs = tableClone.querySelectorAll('input');
    finalInputs.forEach(input => {
        const span = document.createElement('span');
        span.textContent = input.value;
        if (input.parentNode) {
            input.parentNode.replaceChild(span, input);
        }
    });

    const newWin = window.open('', 'Print-Window');
    newWin.document.open();
    newWin.document.write('<html><head><title>Operations Summary</title>');
    newWin.document.write('<style>');
    newWin.document.write('table { border-collapse: collapse; width: 100%; font-family: "Courier New", monospace; }');
    newWin.document.write('th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }');
    newWin.document.write('th { background-color: #f2f2f2; }');
    newWin.document.write('</style>');
    newWin.document.write('</head><body onload="window.print()">');
    newWin.document.write(tableClone.outerHTML);
    newWin.document.write('</body></html>');
    newWin.document.close();
    setTimeout(function () { newWin.close(); }, 10);
}

// Attach to window for HTML event handlers
window.copyToClipboard = copyToClipboard;
window.jumpToCode = jumpToCode;
window.printTable = printTable;
