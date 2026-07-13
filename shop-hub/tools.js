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

const toolsList = document.getElementById('toolsList');

async function loadTools() {
  try {
    const querySnapshot = await getDocs(collection(db, "tools"));
    toolsList.innerHTML = ''; 
    
    if (querySnapshot.empty) {
      toolsList.innerHTML = '<li>No tools found.</li>';
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const tool = docSnap.data();
      const id = docSnap.id;
      
      const li = document.createElement('li');
      li.className = 'part-item'; // Reusing part-item style
      
      li.innerHTML = `
        <div class="part-details">
          <strong>Tool Name:</strong> ${id} <br>
          <strong>Type:</strong> ${tool.type || 'N/A'} <br>
          <strong>Material:</strong> ${tool.material || 'N/A'} <br>
          <strong>Brand:</strong> ${tool.brand || 'N/A'} <br>
          <strong>Flutes:</strong> ${tool.flutes || 'N/A'} <br>
          <strong>Diameter:</strong> ${tool.diameter ? tool.diameter + '"' : 'N/A'} <br>
          <strong>Cutting Length:</strong> ${tool.cuttingLength ? tool.cuttingLength + '"' : 'N/A'}
        </div>
        <div class="actions">
          <button class="edit-btn" data-id="${id}">Edit</button>
          <button class="delete-btn" data-id="${id}">Delete</button>
        </div>
      `;
      
      toolsList.appendChild(li);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        window.location.href = `edit-tool.html?id=${id}`;
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm(`Are you sure you want to delete tool ${id}?`)) {
          await deleteTool(id);
        }
      });
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
