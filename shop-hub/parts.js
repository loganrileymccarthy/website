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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const partsList = document.getElementById('partsList');

// Fetch and render parts
async function loadParts() {
  try {
    const querySnapshot = await getDocs(collection(db, "parts"));
    partsList.innerHTML = ''; // Clear loading text
    
    if (querySnapshot.empty) {
      partsList.innerHTML = '<li>No parts found.</li>';
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const part = docSnap.data();
      const id = docSnap.id;
      
      const li = document.createElement('li');
      li.className = 'part-item';
      
      li.innerHTML = `
        <div class="part-details">
          <strong>Part Number:</strong> ${part.number} <br>
          <strong>Cycle Time:</strong> ${part.cycle || 'N/A'} <br>
          <strong>Setup Time:</strong> ${part.setup || 'N/A'} <br>
          <strong>Note:</strong> ${part.note || 'None'} <br>
          <strong>Assigned Tools:</strong> ${part.tools && part.tools.length > 0 ? part.tools.join(', ') : 'None'}
        </div>
        <div class="actions">
          <button class="edit-btn" data-id="${id}">Edit</button>
          <button class="delete-btn" data-id="${id}">Delete</button>
        </div>
      `;
      
      partsList.appendChild(li);
    });

    // Add event listeners to edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        window.location.href = `edit-part.html?id=${id}`;
      });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm(`Are you sure you want to delete part ${id}?`)) {
          await deletePart(id);
        }
      });
    });
    
  } catch (error) {
    console.error("Error loading parts: ", error);
    partsList.innerHTML = '<li>Error loading parts.</li>';
  }
}

// Delete part
async function deletePart(id) {
  try {
    await deleteDoc(doc(db, "parts", id));
    loadParts(); // Reload the list after deletion
  } catch (error) {
    console.error("Error deleting part: ", error);
    alert("Could not delete the part.");
  }
}

// Load parts on page load
loadParts();
