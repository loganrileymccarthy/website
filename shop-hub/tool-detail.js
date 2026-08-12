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
const toolId = urlParams.get('id');

const contentEl = document.getElementById('toolDetailContent');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (val, suffix = '') =>
  (val !== undefined && val !== null && val !== '') ? `${val}${suffix}` : 'N/A';

function formatVerified(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Stock Widget ──────────────────────────────────────────────────────────────
function buildStockWidget(stock, stockVerified) {
  const qty = stock !== undefined ? stock : null;
  let current = qty !== null ? qty : 0;

  const wrapper = document.createElement('div');
  wrapper.className = 'stock-widget';

  const minusBtn = document.createElement('button');
  minusBtn.type = 'button';
  minusBtn.className = 'stock-btn stock-minus';
  minusBtn.textContent = '−';

  const qtyEl = document.createElement('span');
  qtyEl.className = 'stock-qty' + (qty === null ? ' stock-unset' : '');
  qtyEl.textContent = qty !== null ? qty : '?';

  const plusBtn = document.createElement('button');
  plusBtn.type = 'button';
  plusBtn.className = 'stock-btn stock-plus';
  plusBtn.textContent = '+';

  const verifiedEl = document.createElement('span');
  verifiedEl.className = 'stock-verified';
  verifiedEl.textContent = stockVerified
    ? `verified ${formatVerified(stockVerified)}`
    : 'not verified';

  async function adjust(delta) {
    const next = Math.max(0, current + delta);
    qtyEl.textContent = next;
    qtyEl.classList.remove('stock-unset');
    current = next;
    try {
      const ts = new Date().toISOString();
      await updateDoc(doc(db, "tools", toolId), { stock: next, stockVerified: ts });
      verifiedEl.textContent = `verified ${formatVerified(ts)}`;
    } catch (err) {
      console.error("Error updating stock:", err);
    }
  }

  minusBtn.addEventListener('click', () => adjust(-1));
  plusBtn.addEventListener('click',  () => adjust(+1));

  wrapper.appendChild(minusBtn);
  wrapper.appendChild(qtyEl);
  wrapper.appendChild(plusBtn);
  wrapper.appendChild(verifiedEl);

  return wrapper;
}

// ─── Load Tool ────────────────────────────────────────────────────────────────
async function loadTool() {
  if (!toolId) {
    contentEl.innerHTML = '<p>No tool ID specified.</p>';
    return;
  }

  try {
    const docSnap = await getDoc(doc(db, "tools", toolId));

    if (!docSnap.exists()) {
      contentEl.innerHTML = '<p>Tool not found.</p>';
      return;
    }

    const tool = docSnap.data();
    document.title = `Shop Hub - Tool ${toolId}`;

    contentEl.innerHTML = `
      <div class="tool-detail-card">
        <h2>${toolId}</h2>
        <div class="detail-row">
          <span class="detail-label">Tool Name:</span>
          <span>${toolId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Type:</span>
          <span>${fmt(tool.type)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Material:</span>
          <span>${fmt(tool.material)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Brand:</span>
          <span>${fmt(tool.brand)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Flutes:</span>
          <span>${fmt(tool.flutes)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Diameter:</span>
          <span>${fmt(tool.diameter, '"')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Cutting Length:</span>
          <span>${fmt(tool.cuttingLength, '"')}</span>
        </div>
        <div class="detail-row stock-row" id="stockRow">
          <span class="detail-label">Stock:</span>
          <!-- stock widget injected here -->
        </div>
        <div class="actions-bar">
          <button class="edit-btn" id="editToolBtn">Edit Tool</button>
        </div>
      </div>
    `;

    // Inject the live stock widget into its row
    document.getElementById('stockRow').appendChild(
      buildStockWidget(tool.stock, tool.stockVerified)
    );

    document.getElementById('editToolBtn').addEventListener('click', () => {
      window.location.href = `edit-tool.html?id=${toolId}`;
    });

  } catch (error) {
    console.error("Error loading tool:", error);
    contentEl.innerHTML = '<p>Error loading tool.</p>';
  }
}

loadTool();
