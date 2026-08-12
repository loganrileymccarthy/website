import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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

const toolsList = document.getElementById('toolsList');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVerified(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

async function updateStock(id, newQty) {
  const ts = new Date().toISOString();
  await updateDoc(doc(db, "tools", id), {
    stock: newQty,
    stockVerified: ts
  });
  return ts;
}

// ─── Build a stock widget (qty stepper + verified label) ──────────────────────
function buildStockWidget(id, stock, stockVerified) {
  const qty = stock !== undefined ? stock : null;

  const wrapper = document.createElement('div');
  wrapper.className = 'stock-widget';

  const label = document.createElement('span');
  label.className = 'stock-label';
  label.textContent = 'Stock:';

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
  verifiedEl.textContent = stockVerified ? `verified ${formatVerified(stockVerified)}` : 'not verified';

  // State tracked locally so we don't need to reload after every click
  let current = qty !== null ? qty : 0;

  async function adjust(delta) {
    const next = Math.max(0, current + delta);
    qtyEl.textContent = next;
    qtyEl.classList.remove('stock-unset');
    current = next;
    try {
      const ts = await updateStock(id, next);
      verifiedEl.textContent = `verified ${formatVerified(ts)}`;
    } catch (err) {
      console.error("Error updating stock:", err);
    }
  }

  minusBtn.addEventListener('click', () => adjust(-1));
  plusBtn.addEventListener('click',  () => adjust(+1));

  wrapper.appendChild(label);
  wrapper.appendChild(minusBtn);
  wrapper.appendChild(qtyEl);
  wrapper.appendChild(plusBtn);
  wrapper.appendChild(verifiedEl);

  return wrapper;
}

// ─── Load Tools ───────────────────────────────────────────────────────────────
async function loadTools() {
  try {
    const querySnapshot = await getDocs(collection(db, "tools"));
    toolsList.innerHTML = '';

    if (querySnapshot.empty) {
      toolsList.innerHTML = '<li>No tools found.</li>';
      return;
    }

    // Collect and sort
    const tools = [];
    querySnapshot.forEach(docSnap => tools.push({ id: docSnap.id, ...docSnap.data() }));
    tools.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    tools.forEach(tool => {
      const parts = [];
      if (tool.diameter) parts.push(`${tool.diameter}" diam`);
      if (tool.flutes)   parts.push(`${tool.flutes} fl`);
      if (tool.type)     parts.push(`type ${tool.type}`);
      const descriptor = parts.length > 0 ? ` — ${parts.join(', ')}` : '';

      const li = document.createElement('li');
      li.className = 'part-item tool-list-item';

      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'part-details';
      detailsDiv.innerHTML = `
        <a href="tool-detail.html?id=${encodeURIComponent(tool.id)}" class="part-link">${tool.id}</a>
        <span class="tool-descriptor">${descriptor}</span>
      `;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'actions tool-actions';
      actionsDiv.appendChild(buildStockWidget(tool.id, tool.stock, tool.stockVerified));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.dataset.id = tool.id;
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete tool "${tool.id}"?`)) {
          await deleteTool(tool.id);
        }
      });
      actionsDiv.appendChild(deleteBtn);

      li.appendChild(detailsDiv);
      li.appendChild(actionsDiv);
      toolsList.appendChild(li);
    });

  } catch (error) {
    console.error("Error loading tools:", error);
    toolsList.innerHTML = '<li>Error loading tools.</li>';
  }
}

async function deleteTool(id) {
  try {
    await deleteDoc(doc(db, "tools", id));
    loadTools();
  } catch (error) {
    console.error("Error deleting tool:", error);
    alert("Could not delete the tool.");
  }
}

loadTools();
