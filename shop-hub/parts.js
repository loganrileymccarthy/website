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

const partsList = document.getElementById('partsList');

async function loadParts() {
  try {
    const querySnapshot = await getDocs(collection(db, "parts"));
    partsList.innerHTML = '';

    if (querySnapshot.empty) {
      partsList.innerHTML = '<li>No parts found.</li>';
      return;
    }

    // Collect and sort by part number
    const parts = [];
    querySnapshot.forEach(docSnap => parts.push({ id: docSnap.id, ...docSnap.data() }));
    parts.sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));

    parts.forEach(part => {
      // Build a short descriptor line
      const descriptorParts = [];
      if (part.cycle) descriptorParts.push(`cycle ${part.cycle}`);
      if (part.setup) descriptorParts.push(`setup ${part.setup}`);
      const opCount = part.operations ? part.operations.length : 0;
      if (opCount > 0) descriptorParts.push(`${opCount} op${opCount !== 1 ? 's' : ''}`);
      const descriptor = descriptorParts.length > 0 ? ` — ${descriptorParts.join(', ')}` : '';

      const li = document.createElement('li');
      li.className = 'part-item tool-list-item';
      li.innerHTML = `
        <div class="part-details">
          <a href="part-detail.html?id=${encodeURIComponent(part.id)}" class="part-link">${part.number}</a>
          <span class="tool-descriptor">${descriptor}</span>
        </div>
        <div class="actions">
          <button class="delete-btn" data-id="${part.id}">Delete</button>
        </div>
      `;
      partsList.appendChild(li);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm(`Are you sure you want to delete part ${id}?`)) {
          await deletePart(id);
        }
      });
    });

  } catch (error) {
    console.error("Error loading parts:", error);
    partsList.innerHTML = '<li>Error loading parts.</li>';
  }
}

async function deletePart(id) {
  try {
    await deleteDoc(doc(db, "parts", id));
    loadParts();
  } catch (error) {
    console.error("Error deleting part:", error);
    alert("Could not delete the part.");
  }
}

loadParts();
