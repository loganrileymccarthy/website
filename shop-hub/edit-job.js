import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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

const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('id');

// ─── Populate the part dropdown ────────────────────────────────────────────────
async function loadParts() {
  try {
    const snap = await getDocs(collection(db, "parts"));
    const parts = [];
    snap.forEach(d => parts.push({ id: d.id, ...d.data() }));
    parts.sort((a, b) => String(a.number || a.id).localeCompare(String(b.number || b.id), undefined, { numeric: true }));

    const select = document.getElementById('partId');
    parts.forEach(part => {
      const opt = document.createElement('option');
      opt.value = part.id;
      opt.textContent = part.number ? `${part.number} (${part.id})` : part.id;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Error loading parts:", err);
  }
}

// ─── Load existing job when editing ───────────────────────────────────────────
async function loadJobForEdit(id) {
  try {
    const docSnap = await getDoc(doc(db, "jobs", id));
    if (docSnap.exists()) {
      const job = docSnap.data();
      document.getElementById('jobId').value = id;
      document.getElementById('jobId').readOnly = true;
      document.getElementById('partId').value = job.partId || '';
      const qtyOrd = job.quantityOrdered !== undefined ? job.quantityOrdered : (job.quantity !== undefined ? job.quantity : '');
      document.getElementById('quantityOrdered').value = qtyOrd;
      document.getElementById('startDate').value = job.startDate || '';
      document.getElementById('dueDate').value = job.dueDate || '';
      document.getElementById('notes').value = job.notes || '';
    } else {
      console.log("No such job document!");
    }
  } catch (error) {
    console.error("Error fetching job:", error);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
await loadParts();

if (editId) {
  loadJobForEdit(editId);
}

// ─── Submit ───────────────────────────────────────────────────────────────────
document.getElementById('inputForm').addEventListener('submit', submitForm);

function submitForm(e) {
  e.preventDefault();

  const jobId           = document.getElementById('jobId').value.trim();
  const partId          = document.getElementById('partId').value;
  const quantityOrdered = document.getElementById('quantityOrdered').value;
  const startDate       = document.getElementById('startDate').value;
  const dueDate         = document.getElementById('dueDate').value;
  const notes           = document.getElementById('notes').value.trim();

  saveJob(jobId, partId, quantityOrdered, startDate, dueDate, notes);

  const alertEl = document.querySelector('.alert');
  alertEl.textContent = editId ? "Saved job!" : "Created job!";
  alertEl.style.display = 'block';
  setTimeout(() => { alertEl.style.display = 'none'; }, 3000);

  if (!editId) {
    document.getElementById('inputForm').reset();
    // Re-select the placeholder after reset
    document.getElementById('partId').value = '';
  } else {
    setTimeout(() => { window.location.href = 'jobs.html'; }, 1000);
  }
}

async function saveJob(jobId, partId, quantityOrdered, startDate, dueDate, notes) {
  try {
    const data = {};
    if (partId)          data.partId          = partId;
    if (quantityOrdered) data.quantityOrdered = parseInt(quantityOrdered);
    if (startDate)       data.startDate       = startDate;
    if (dueDate)         data.dueDate         = dueDate;
    if (notes)           data.notes           = notes;

    await setDoc(doc(db, "jobs", jobId), data, { merge: true });
    console.log("Job saved:", jobId);
  } catch (err) {
    console.error("Error saving job:", err);
  }
}
