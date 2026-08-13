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
const partId = urlParams.get('id');

const contentEl = document.getElementById('partDetailContent');

// ─── Build the operations section HTML ────────────────────────────────────────
function buildOperationsHTML(operations) {
  if (!operations || operations.length === 0) {
    return `<p class="no-ops-msg">No operations defined.</p>`;
  }

  return operations.map((op, idx) => {
    const cardTitle = op.name ? op.name : `Operation ${idx + 1}`;
    const rows = (op.steps && op.steps.length > 0)
      ? op.steps.map((step, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${step.toolId ? `<a href="tool-detail.html?id=${encodeURIComponent(step.toolId)}">${step.toolId}</a>` : '—'}</td>
            <td>${escHtml(step.description || '—')}</td>
            <td>${escHtml(step.minZ || '—')}</td>
          </tr>`).join('')
      : `<tr><td colspan="4" style="text-align:center;opacity:0.6;">No steps</td></tr>`;

    return `
      <div class="op-display-card">
        <h3>${escHtml(cardTitle)}</h3>
        <table class="op-display-table">
          <thead>
            <tr>
              <th style="width:2.5em;">#</th>
              <th style="width:90px;">Tool ID</th>
              <th>Toolpath Description</th>
              <th style="width:90px;">Min Z</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');
}

// Simple HTML escaping
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Load Part ────────────────────────────────────────────────────────────────
async function loadPart() {
  if (!partId) {
    contentEl.innerHTML = '<p>No part ID specified.</p>';
    return;
  }

  try {
    const docSnap = await getDoc(doc(db, "parts", partId));

    if (!docSnap.exists()) {
      contentEl.innerHTML = '<p>Part not found.</p>';
      return;
    }

    const part = docSnap.data();

    document.title = `Shop Hub - Part ${part.number}`;

    contentEl.innerHTML = `
      <div class="part-detail-card">
        <h2>Part #${part.number}</h2>
        <div class="detail-row">
          <span class="detail-label">Part Number:</span>
          <span>${escHtml(part.number)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Cycle Time:</span>
          <span>${escHtml(part.cycle || 'N/A')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Setup Time:</span>
          <span>${escHtml(part.setup || 'N/A')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Note:</span>
          <span>${escHtml(part.note || 'None')}</span>
        </div>

        <div class="ops-section">
          <div class="ops-section-title">Sequence of Operations</div>
          ${buildOperationsHTML(part.operations)}
        </div>

        <div class="actions-bar">
          <button class="edit-btn" id="editPartBtn">Edit Part</button>
        </div>
      </div>
    `;

    document.getElementById('editPartBtn').addEventListener('click', () => {
      window.location.href = `edit-part.html?id=${partId}`;
    });

  } catch (error) {
    console.error("Error loading part:", error);
    contentEl.innerHTML = '<p>Error loading part.</p>';
  }
}

loadPart();
