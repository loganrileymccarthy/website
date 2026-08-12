import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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

const jobsList = document.getElementById('jobsList');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return 'N/A';
  // Dates are stored as YYYY-MM-DD strings; parse as local midnight to avoid TZ shift
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

/** Returns 'overdue' | 'due-soon' (within 7 days) | 'open' */
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

// ─── Load Jobs ────────────────────────────────────────────────────────────────
async function loadJobs() {
  try {
    const querySnapshot = await getDocs(collection(db, "jobs"));
    jobsList.innerHTML = '';

    if (querySnapshot.empty) {
      jobsList.innerHTML = '<li>No jobs found.</li>';
      return;
    }

    // Collect and sort by due date (soonest first), then by ID
    const jobs = [];
    querySnapshot.forEach(docSnap => jobs.push({ id: docSnap.id, ...docSnap.data() }));
    jobs.sort((a, b) => {
      const ad = a.dueDate || '9999-12-31';
      const bd = b.dueDate || '9999-12-31';
      if (ad !== bd) return ad.localeCompare(bd);
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });

    jobs.forEach(job => {
      const status = dueStatus(job.dueDate);
      const descriptorParts = [];
      if (job.partId)   descriptorParts.push(`Part ${job.partId}`);
      if (job.quantity) descriptorParts.push(`Qty ${job.quantity}`);
      if (job.dueDate)  descriptorParts.push(`Due ${fmtDate(job.dueDate)}`);
      const descriptor = descriptorParts.length > 0 ? ` — ${descriptorParts.join(', ')}` : '';

      const li = document.createElement('li');
      li.className = 'part-item tool-list-item';
      li.innerHTML = `
        <div class="part-details">
          <a href="job-detail.html?id=${encodeURIComponent(job.id)}" class="part-link">${job.id}</a>
          <span class="tool-descriptor">${descriptor}</span>
          <span class="job-status ${status}">${statusLabel[status]}</span>
        </div>
        <div class="actions">
          <button class="delete-btn" data-id="${job.id}">Delete</button>
        </div>
      `;
      jobsList.appendChild(li);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm(`Are you sure you want to delete job "${id}"?`)) {
          await deleteJob(id);
        }
      });
    });

  } catch (error) {
    console.error("Error loading jobs:", error);
    jobsList.innerHTML = '<li>Error loading jobs.</li>';
  }
}

async function deleteJob(id) {
  try {
    await deleteDoc(doc(db, "jobs", id));
    loadJobs();
  } catch (error) {
    console.error("Error deleting job:", error);
    alert("Could not delete the job.");
  }
}

loadJobs();
