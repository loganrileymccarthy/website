// get firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// locate my firebase database and give access
const firebaseConfig = {
  apiKey: "AIzaSyCKOYAiEH5YqwYEC_y_4upwcNb5D2FVo7M",
  authDomain: "protobase-cd3df.firebaseapp.com",
  databaseURL: "https://protobase-cd3df-default-rtdb.firebaseio.com",
  projectId: "protobase-cd3df",
  storageBucket: "protobase-cd3df.firebasestorage.app",
  messagingSenderId: "435749357715",
  appId: "1:435749357715:web:cb579709a41c27a492a566",
  measurementId: "G-FZM8W21VEG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Check for Edit Mode
const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('id');

const operationsContainer = document.getElementById('operationsContainer');

// ─── Tools cache (loaded once, shared by all dropdowns) ───────────────────────
// Each entry: { id, label }  e.g. { id: "T01", label: "T01 — 0.5\" diam, 4 fl" }
let toolOptions = [];

async function loadToolOptions() {
  try {
    const querySnapshot = await getDocs(collection(db, "tools"));
    toolOptions = [];
    querySnapshot.forEach(docSnap => {
      const tool = docSnap.data();
      const id = docSnap.id;
      const parts = [];
      if (tool.diameter) parts.push(`${tool.diameter}" diam`);
      if (tool.flutes)   parts.push(`${tool.flutes} fl`);
      if (tool.type)     parts.push(`${tool.type}`);
      const descriptor = parts.length > 0 ? ` — ${parts.join(', ')}` : '';
      toolOptions.push({ id, label: `${id}${descriptor}` });
    });
    // Sort alphabetically by id
    toolOptions.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  } catch (err) {
    console.error("Error loading tools for dropdowns:", err);
  }
}

// ─── Build a <select> for the Tool ID column ──────────────────────────────────
function buildToolSelect(selectedId = '') {
  const sel = document.createElement('select');
  sel.className = 'col-toolid';

  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '— select tool —';
  sel.appendChild(blank);

  toolOptions.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.id;
    option.textContent = opt.label;
    if (opt.id === selectedId) option.selected = true;
    sel.appendChild(option);
  });

  return sel;
}

// ─── Operation Card Builder ───────────────────────────────────────────────────

/**
 * Adds a row to an operation card's table body.
 * @param {HTMLElement} tbody - The <tbody> to append to.
 * @param {object} [data]     - Optional pre-fill: { toolId, description, minZ }
 */
function addRow(tbody, data = {}) {
  const tr = document.createElement('tr');

  // Tool ID cell — dropdown
  const tdTool = document.createElement('td');
  tdTool.appendChild(buildToolSelect(data.toolId || ''));

  // Toolpath Description cell
  const tdDesc = document.createElement('td');
  const descInput = document.createElement('input');
  descInput.type = 'text';
  descInput.placeholder = 'Face mill top';
  descInput.className = 'col-desc';
  descInput.value = data.description || '';
  tdDesc.appendChild(descInput);

  // Min Z cell
  const tdMinZ = document.createElement('td');
  const minZInput = document.createElement('input');
  minZInput.type = 'text';
  minZInput.placeholder = '-0.500';
  minZInput.className = 'col-minz';
  minZInput.value = data.minZ || '';
  tdMinZ.appendChild(minZInput);

  // Remove row cell
  const tdRemove = document.createElement('td');
  tdRemove.style.width = '2em';
  tdRemove.style.textAlign = 'center';
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-row-btn';
  removeBtn.title = 'Remove row';
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => tr.remove());
  tdRemove.appendChild(removeBtn);

  tr.appendChild(tdTool);
  tr.appendChild(tdDesc);
  tr.appendChild(tdMinZ);
  tr.appendChild(tdRemove);
  tbody.appendChild(tr);
}

/**
 * Creates and appends a new operation card to the operations container.
 * @param {object} [data] - Optional pre-fill: { name, steps[] }
 */
function addOperationCard(data = {}) {
  const card = document.createElement('div');
  card.className = 'op-card';

  // ─── Card header (name input + remove button) ─────────────────────────────
  const header = document.createElement('div');
  header.className = 'op-card-header';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Operation name (e.g. Op 10 - Top Side)';
  nameInput.className = 'op-name';
  nameInput.value = data.name || '';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-op-btn';
  removeBtn.textContent = '✕ Remove';
  removeBtn.addEventListener('click', () => card.remove());

  header.appendChild(nameInput);
  header.appendChild(removeBtn);

  // ─── Steps table ──────────────────────────────────────────────────────────
  const table = document.createElement('table');
  table.className = 'op-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th style="width:180px;">Tool ID</th>
        <th>Toolpath Description</th>
        <th style="width:90px;">Min Z</th>
        <th style="width:2em;"></th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  // Pre-fill rows if we have steps data
  if (data.steps && data.steps.length > 0) {
    data.steps.forEach(step => addRow(tbody, step));
  } else {
    addRow(tbody); // start with one empty row
  }

  // ─── Add Row button ───────────────────────────────────────────────────────
  const addRowBtn = document.createElement('button');
  addRowBtn.type = 'button';
  addRowBtn.className = 'add-row-btn';
  addRowBtn.textContent = '+ Add Step';
  addRowBtn.addEventListener('click', () => addRow(tbody));

  card.appendChild(header);
  card.appendChild(table);
  card.appendChild(addRowBtn);

  operationsContainer.appendChild(card);
}

// ─── Add Operation button ─────────────────────────────────────────────────────
document.getElementById('addOpBtn').addEventListener('click', () => addOperationCard());

// ─── Read all operation cards into a data structure ───────────────────────────
function collectOperations() {
  const cards = operationsContainer.querySelectorAll('.op-card');
  const operations = [];
  cards.forEach(card => {
    const name = card.querySelector('.op-name').value.trim();
    const steps = [];
    card.querySelectorAll('tbody tr').forEach(row => {
      const toolId      = row.querySelector('.col-toolid').value.trim();
      const description = row.querySelector('.col-desc').value.trim();
      const minZ        = row.querySelector('.col-minz').value.trim();
      // Only include a row if at least one field is filled
      if (toolId || description || minZ) {
        steps.push({ toolId, description, minZ });
      }
    });
    if (name || steps.length > 0) {
      operations.push({ name, steps });
    }
  });
  return operations;
}

// ─── Initialize Page ──────────────────────────────────────────────────────────
async function initializePage() {
  // Load tools first so dropdowns are ready before cards are built
  await loadToolOptions();

  if (editId) {
    await loadPartForEdit(editId);
  }
}

async function loadPartForEdit(id) {
  try {
    const docSnap = await getDoc(doc(db, "parts", id));
    if (docSnap.exists()) {
      const part = docSnap.data();
      document.getElementById('partNum').value = part.number;
      document.getElementById('partNum').readOnly = true; // Prevent changing the ID
      document.getElementById('cycle').value = part.cycle || '';
      document.getElementById('setup').value = part.setup || '';
      document.getElementById('note').value = part.note || '';

      // Restore operation cards
      if (part.operations && Array.isArray(part.operations)) {
        part.operations.forEach(op => addOperationCard(op));
      }
    } else {
      console.log("No such document!");
    }
  } catch (error) {
    console.error("Error fetching document:", error);
  }
}

initializePage();

// ─── Form Submission ──────────────────────────────────────────────────────────
document.getElementById('inputForm').addEventListener('submit', submitForm);

function submitForm(e) {
  e.preventDefault();

  const partNum    = getInputVal('partNum');
  const cycle      = getInputVal('cycle');
  const setup      = getInputVal('setup');
  const note       = getInputVal('note');
  const operations = collectOperations();

  savePart(partNum, cycle, setup, note, operations);

  const alertEl = document.querySelector('.alert');
  alertEl.textContent = editId ? "Saved part!" : "Created part!";
  alertEl.style.display = 'block';

  setTimeout(() => { alertEl.style.display = 'none'; }, 3000);

  if (!editId) {
    document.getElementById('inputForm').reset();
    operationsContainer.innerHTML = '';
  } else {
    setTimeout(() => { window.location.href = 'parts.html'; }, 1000);
  }
}

function getInputVal(id) {
  return document.getElementById(id).value;
}

async function savePart(partNum, cycle, setup, note, operations) {
  try {
    await setDoc(doc(db, "parts", partNum), {
      number: partNum,
      cycle,
      setup,
      note,
      operations
    });
    console.log("Document written with ID:", partNum);
  } catch (e) {
    console.error("Error saving document:", e);
  }
}