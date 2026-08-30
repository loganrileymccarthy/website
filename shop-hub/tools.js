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

const toolsSummary = document.getElementById('toolsSummary');
const toolsCategories = document.getElementById('toolsCategories');
const expandAllBtn = document.getElementById('expandAllBtn');
const collapseAllBtn = document.getElementById('collapseAllBtn');

const CATEGORIES = [
  { id: 'drill', label: 'Drill' },
  { id: 'spot drill', label: 'Spot Drill' },
  { id: 'centerdrill', label: 'Centerdrill' },
  { id: 'countersink', label: 'Countersink' },
  { id: 'chamfer', label: 'Chamfer' },
  { id: 'endmill', label: 'Endmill' },
  { id: 'ball endmill', label: 'Ball Endmill' },
  { id: 'tap', label: 'Tap' },
  { id: 'threadmill', label: 'Threadmill' }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function updateStock(id, newQty) {
  const ts = new Date().toISOString();
  await updateDoc(doc(db, "tools", id), {
    stock: newQty,
    stockVerified: ts
  });
  return ts;
}

// ─── Build a stock widget (qty stepper) ───────────────────────────────────────
function buildStockWidget(id, stock) {
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

  let current = qty !== null ? qty : 0;

  async function adjust(delta) {
    const next = Math.max(0, current + delta);
    qtyEl.textContent = next;
    qtyEl.classList.remove('stock-unset');
    current = next;
    try {
      await updateStock(id, next);
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

  return wrapper;
}

// ─── Build Category Card Component ───────────────────────────────────────────
function createCategoryCard(catInfo, categoryTools) {
  const count = categoryTools.length;

  const card = document.createElement('div');
  // Collapse cards by default if empty, keep open if non-empty
  card.className = 'category-card' + (count === 0 ? ' collapsed' : '');

  const header = document.createElement('div');
  header.className = 'category-header';
  header.innerHTML = `
    <div class="category-title-group">
      <span class="category-name">${catInfo.label}</span>
      <span class="category-badge ${count === 0 ? 'empty' : ''}">${count}</span>
    </div>
    <div class="category-toggle">
      <i class="fa fa-chevron-down"></i>
    </div>
  `;

  header.addEventListener('click', () => {
    card.classList.toggle('collapsed');
  });

  const body = document.createElement('div');
  body.className = 'category-body';

  if (count === 0) {
    body.innerHTML = `<div class="empty-category-msg">No tools in this category</div>`;
  } else {
    const ul = document.createElement('ul');
    ul.className = 'parts-list';

    categoryTools.forEach(tool => {
      const parts = [];
      if (tool.diameter)     parts.push(`${tool.diameter}" diam`);
      if (tool.cuttingLength) parts.push(`${tool.cuttingLength}" LOC`);
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
      actionsDiv.appendChild(buildStockWidget(tool.id, tool.stock));

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
      ul.appendChild(li);
    });

    body.appendChild(ul);
  }

  card.appendChild(header);
  card.appendChild(body);
  return card;
}

// ─── Load Tools ───────────────────────────────────────────────────────────────
async function loadTools() {
  try {
    const querySnapshot = await getDocs(collection(db, "tools"));
    toolsCategories.innerHTML = '';

    if (querySnapshot.empty) {
      if (toolsSummary) toolsSummary.textContent = 'Total Tools: 0';
      toolsCategories.innerHTML = '<p>No tools found.</p>';
      return;
    }

    const tools = [];
    querySnapshot.forEach(docSnap => tools.push({ id: docSnap.id, ...docSnap.data() }));

    if (toolsSummary) {
      toolsSummary.textContent = `Total Tools: ${tools.length}`;
    }

    // Group tools into categories
    const categorized = {};
    CATEGORIES.forEach(cat => {
      categorized[cat.id] = [];
    });
    categorized['uncategorized'] = [];

    tools.forEach(tool => {
      const typeKey = (tool.type || '').toString().trim().toLowerCase();
      if (categorized[typeKey]) {
        categorized[typeKey].push(tool);
      } else {
        categorized['uncategorized'].push(tool);
      }
    });

    // Sort inside each category
    Object.keys(categorized).forEach(key => {
      categorized[key].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    });

    // Render category cards
    CATEGORIES.forEach(cat => {
      const cardEl = createCategoryCard(cat, categorized[cat.id]);
      toolsCategories.appendChild(cardEl);
    });

    // Render uncategorized card if any exist
    if (categorized['uncategorized'].length > 0) {
      const uncatCard = createCategoryCard(
        { id: 'uncategorized', label: 'Uncategorized' },
        categorized['uncategorized']
      );
      toolsCategories.appendChild(uncatCard);
    }

  } catch (error) {
    console.error("Error loading tools:", error);
    toolsCategories.innerHTML = '<p>Error loading tools.</p>';
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

if (expandAllBtn) {
  expandAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.category-card').forEach(card => card.classList.remove('collapsed'));
  });
}

if (collapseAllBtn) {
  collapseAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.category-card').forEach(card => card.classList.add('collapsed'));
  });
}

loadTools();
