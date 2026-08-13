import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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
const jobId = urlParams.get('id');

const contentEl = document.getElementById('jobDetailContent');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (val, suffix = '') =>
  (val !== undefined && val !== null && val !== '') ? `${val}${suffix}` : 'N/A';

function fmtDate(iso) {
  if (!iso) return 'N/A';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function getJobTotals(job) {
  const ordered = job.quantityOrdered !== undefined ? job.quantityOrdered : (job.quantity || 0);
  let complete = 0;
  if (job.batches && Array.isArray(job.batches) && job.batches.length > 0) {
    complete = job.batches.reduce((sum, b) => sum + Number(b.qty || 0), 0);
  } else if (job.quantityComplete !== undefined) {
    complete = Number(job.quantityComplete);
  }
  return { ordered, complete };
}

/** Returns 'completed' | 'overdue' | 'due-soon' | 'open' */
function dueStatus(job) {
  const { ordered, complete } = getJobTotals(job);
  if (ordered > 0 && complete >= ordered) {
    return 'completed';
  }
  const dueDateStr = job.dueDate;
  if (!dueDateStr) return 'open';
  const [y, m, d] = dueDateStr.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due - now) / 86400000);
  if (diffDays < 0)  return 'overdue';
  if (diffDays <= 7) return 'due-soon';
  return 'open';
}

const statusLabel = { completed: 'Completed', overdue: 'Overdue', 'due-soon': 'Due Soon', open: 'Open' };

// ─── Load & Render Job ─────────────────────────────────────────────────────────
async function loadJob() {
  if (!jobId) {
    contentEl.innerHTML = '<p>No job ID specified.</p>';
    return;
  }

  try {
    const docSnap = await getDoc(doc(db, "jobs", jobId));

    if (!docSnap.exists()) {
      contentEl.innerHTML = '<p>Job not found.</p>';
      return;
    }

    const job = docSnap.data();
    document.title = `Shop Hub - Job ${jobId}`;

    renderJobDetail(job);

  } catch (error) {
    console.error("Error loading job:", error);
    contentEl.innerHTML = '<p>Error loading job.</p>';
  }
}

function renderJobDetail(job) {
  const { ordered, complete } = getJobTotals(job);
  const status = dueStatus(job);
  const pct = ordered > 0 ? Math.min(100, Math.round((complete / ordered) * 100)) : 0;
  const batches = job.batches || [];

  const todayIso = new Date().toISOString().split('T')[0];

  const batchRowsHTML = batches.length > 0
    ? batches.map((batch, idx) => `
        <tr>
          <td>Batch ${idx + 1}</td>
          <td><strong>+${batch.qty}</strong></td>
          <td>${fmtDate(batch.date)}</td>
          <td>${batch.note ? escHtml(batch.note) : '—'}</td>
          <td>
            <button type="button" class="batch-delete-btn" data-batch-id="${batch.id}">Delete</button>
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="5" style="text-align:center;opacity:0.6;">No completed batches logged yet.</td></tr>`;

  contentEl.innerHTML = `
    <div class="tool-detail-card">
      <h2>${jobId} <span class="job-badge ${status}">${statusLabel[status]}</span></h2>
      <div class="detail-row">
        <span class="detail-label">Job ID:</span>
        <span>${jobId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Part:</span>
        <span>${job.partId
          ? `<a href="part-detail.html?id=${encodeURIComponent(job.partId)}">${job.partId}</a>`
          : 'N/A'
        }</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Quantity Ordered:</span>
        <span>${fmt(ordered)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Quantity Complete:</span>
        <div style="flex:1;">
          <span><strong>${complete}</strong> / ${ordered} (${pct}%)</span>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill ${status === 'completed' ? 'completed' : ''}" style="width:${pct}%;"></div>
            <div class="progress-bar-text">${complete} / ${ordered} (${pct}%)</div>
          </div>
        </div>
      </div>
      <div class="detail-row">
        <span class="detail-label">Start Date:</span>
        <span>${fmtDate(job.startDate)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Due Date:</span>
        <span>${fmtDate(job.dueDate)}</span>
      </div>
      ${job.notes ? `
      <div class="detail-row">
        <span class="detail-label">Notes:</span>
        <span style="white-space: pre-wrap;">${escHtml(job.notes)}</span>
      </div>` : ''}

      <div class="batch-section">
        <h3>Batches of Completed Parts</h3>
        <table class="batch-table">
          <thead>
            <tr>
              <th>Batch #</th>
              <th>Qty Complete</th>
              <th>Date</th>
              <th>Notes / Lot</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${batchRowsHTML}
          </tbody>
        </table>

        <form id="addBatchForm" class="batch-form">
          <div class="batch-field">
            <label for="batchQty">Batch Qty</label>
            <input type="number" id="batchQty" min="1" required placeholder="e.g. 25" style="width: 100px;">
          </div>
          <div class="batch-field">
            <label for="batchDate">Date Logged</label>
            <input type="date" id="batchDate" value="${todayIso}">
          </div>
          <div class="batch-field" style="flex:1;">
            <label for="batchNote">Notes / Lot # (optional)</label>
            <input type="text" id="batchNote" placeholder="e.g. Op 1 complete or Lot 42">
          </div>
          <button type="submit" class="batch-add-btn">+ Log Batch</button>
        </form>
      </div>

      <div class="actions-bar">
        <button class="edit-btn" id="editJobBtn">Edit Job</button>
      </div>
    </div>
  `;

  document.getElementById('editJobBtn').addEventListener('click', () => {
    window.location.href = `edit-job.html?id=${jobId}`;
  });

  // Handle Add Batch form submit
  document.getElementById('addBatchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const qtyInput = document.getElementById('batchQty');
    const dateInput = document.getElementById('batchDate');
    const noteInput = document.getElementById('batchNote');

    const qty = parseInt(qtyInput.value);
    if (!qty || qty <= 0) return;

    const newBatch = {
      id: 'batch-' + Date.now(),
      qty: qty,
      date: dateInput.value || todayIso,
      note: noteInput.value.trim()
    };

    const updatedBatches = [...batches, newBatch];
    const newComplete = updatedBatches.reduce((s, b) => s + Number(b.qty || 0), 0);

    try {
      await updateDoc(doc(db, "jobs", jobId), {
        batches: updatedBatches,
        quantityComplete: newComplete
      });
      job.batches = updatedBatches;
      job.quantityComplete = newComplete;
      renderJobDetail(job);
    } catch (err) {
      console.error("Error logging batch:", err);
      alert("Could not log batch.");
    }
  });

  // Handle Delete Batch buttons
  document.querySelectorAll('.batch-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const bId = e.target.getAttribute('data-batch-id');
      if (!confirm("Are you sure you want to delete this batch entry?")) return;

      const updatedBatches = batches.filter(b => b.id !== bId);
      const newComplete = updatedBatches.reduce((s, b) => s + Number(b.qty || 0), 0);

      try {
        await updateDoc(doc(db, "jobs", jobId), {
          batches: updatedBatches,
          quantityComplete: newComplete
        });
        job.batches = updatedBatches;
        job.quantityComplete = newComplete;
        renderJobDetail(job);
      } catch (err) {
        console.error("Error deleting batch:", err);
        alert("Could not delete batch.");
      }
    });
  });
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

loadJob();
