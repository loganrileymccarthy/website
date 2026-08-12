import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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

/** Returns 'overdue' | 'due-soon' | 'open' */
function dueStatus(dueDateStr) {
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

const statusLabel = { overdue: 'Overdue', 'due-soon': 'Due Soon', open: 'Open' };

// ─── Load Job ─────────────────────────────────────────────────────────────────
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

    const status = dueStatus(job.dueDate);

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
          <span class="detail-label">Quantity:</span>
          <span>${fmt(job.quantity)}</span>
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
          <span style="white-space: pre-wrap;">${job.notes}</span>
        </div>` : ''}
        <div class="actions-bar">
          <button class="edit-btn" id="editJobBtn">Edit Job</button>
        </div>
      </div>
    `;

    document.getElementById('editJobBtn').addEventListener('click', () => {
      window.location.href = `edit-job.html?id=${jobId}`;
    });

  } catch (error) {
    console.error("Error loading job:", error);
    contentEl.innerHTML = '<p>Error loading job.</p>';
  }
}

loadJob();
