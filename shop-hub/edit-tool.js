import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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
const editId = urlParams.get('id');

if (editId) {
  loadToolForEdit(editId);
}

async function loadToolForEdit(id) {
  try {
    const docSnap = await getDoc(doc(db, "tools", id));
    if (docSnap.exists()) {
      const tool = docSnap.data();
      document.getElementById('toolName').value = id;
      document.getElementById('toolName').readOnly = true; 
      document.getElementById('type').value = tool.type || '';
      document.getElementById('material').value = tool.material || '';
      document.getElementById('brand').value = tool.brand || '';
      document.getElementById('flutes').value = tool.flutes || '';
      document.getElementById('diameter').value = tool.diameter || '';
      document.getElementById('cuttingLength').value = tool.cuttingLength || '';
    } else {
      console.log("No such document!");
    }
  } catch (error) {
    console.error("Error fetching document:", error);
  }
}

document.getElementById('inputForm').addEventListener('submit', submitForm);

function submitForm(e){
  e.preventDefault();

  const toolName = document.getElementById('toolName').value;
  const type = document.getElementById('type').value;
  const material = document.getElementById('material').value;
  const brand = document.getElementById('brand').value;
  const flutes = document.getElementById('flutes').value;
  const diameter = document.getElementById('diameter').value;
  const cuttingLength = document.getElementById('cuttingLength').value;

  addTool(toolName, type, material, brand, flutes, diameter, cuttingLength);

  const alertEl = document.querySelector('.alert');
  alertEl.textContent = editId ? "Saved tool!" : "Created tool!";
  alertEl.style.display = 'block';

  setTimeout(function(){
    alertEl.style.display = 'none';
  },3000);

  if (!editId) {
    document.getElementById('inputForm').reset();
  } else {
    setTimeout(() => { window.location.href = 'tools.html'; }, 1000);
  }
}

async function addTool(toolName, type, material, brand, flutes, diameter, cuttingLength) {
  try {
    const data = {};
    if (type) data.type = parseInt(type);
    if (material) data.material = parseInt(material);
    if (brand) data.brand = parseInt(brand);
    if (flutes) data.flutes = parseInt(flutes);
    if (diameter) data.diameter = parseFloat(diameter);
    if (cuttingLength) data.cuttingLength = parseFloat(cuttingLength);

    await setDoc(doc(db, "tools", toolName), data);
    console.log("Document written with ID: ", toolName);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}