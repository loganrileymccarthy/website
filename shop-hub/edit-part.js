//get firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

//locate my firebase database and give access
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

// initialize my firebase project as app
const app = initializeApp(firebaseConfig);

// get the firestore from my firebase project
const db = getFirestore(app);

// Check for Edit Mode
const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('id');

async function initializePage() {
  await loadTools();
  if (editId) {
    loadPartForEdit(editId);
  }
}

async function loadTools() {
  const toolsContainer = document.getElementById('toolsCheckboxes');
  try {
    const querySnapshot = await getDocs(collection(db, "tools"));
    toolsContainer.innerHTML = ''; // clear loading text
    
    if (querySnapshot.empty) {
      toolsContainer.innerHTML = 'No tools found.';
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const tool = docSnap.data();
      const id = docSnap.id;
      
      const label = document.createElement('label');
      label.style.display = 'block';
      label.style.fontWeight = 'normal';
      label.style.marginBottom = '5px';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'tools';
      checkbox.value = id;
      checkbox.style.width = 'auto'; // override the 100% width from css
      checkbox.style.marginRight = '10px';
      
      // Build the display text
      let text = ` ${id}`;
      if (tool.diameter || tool.flutes) {
        text += ` (`;
        if (tool.diameter) text += `${tool.diameter}" diam`;
        if (tool.diameter && tool.flutes) text += `, `;
        if (tool.flutes) text += `${tool.flutes} flutes`;
        text += `)`;
      }
      
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(text));
      toolsContainer.appendChild(label);
    });
  } catch (error) {
    console.error("Error loading tools:", error);
    toolsContainer.innerHTML = 'Error loading tools.';
  }
}

initializePage();

async function loadPartForEdit(id) {
  try {
    const docSnap = await getDoc(doc(db, "parts", id));
    if (docSnap.exists()) {
      const part = docSnap.data();
      document.getElementById('partNum').value = part.number;
      document.getElementById('partNum').readOnly = true; // Prevent changing the ID
      document.getElementById('cycle').value = part.cycle || '';
      document.getElementById('setup').value = part.setup || '';
      document.getElementById('note').value = part.note || '';
      
      if (part.tools && Array.isArray(part.tools)) {
        part.tools.forEach(toolId => {
          const cb = document.querySelector(`input[name="tools"][value="${toolId}"]`);
          if (cb) cb.checked = true;
        });
      }
    } else {
      console.log("No such document!");
    }
  } catch (error) {
    console.error("Error fetching document:", error);
  }
}

// Listen for form submit
document.getElementById('inputForm').addEventListener('submit', submitForm);

// Do several things on button press
function submitForm(e){
  e.preventDefault();

  // 1. get values
  var partNum = getInputVal('partNum');
  var cycle = getInputVal('cycle');
  var setup = getInputVal('setup');
  var note = getInputVal('note');
  
  // Get selected tools
  var tools = Array.from(document.querySelectorAll('input[name="tools"]:checked')).map(cb => cb.value);

  // 2. save part information
  addPart(partNum, cycle, setup, note, tools);

  // 3. show alert
  const alertEl = document.querySelector('.alert');
  alertEl.textContent = editId ? "Saved part!" : "Created part!";
  alertEl.style.display = 'block';

  // 4. hide alert after 3 seconds
  setTimeout(function(){
    alertEl.style.display = 'none';
  },3000);

  // 5.a clear form only if we are not editing
  if (!editId) {
    document.getElementById('inputForm').reset();
  } else {
    // 5.b navigate back to list view after a successful edit
    setTimeout(() => { window.location.href = 'parts.html'; }, 1000);
  }
}

// get form values shortcut
function getInputVal(id){
  return document.getElementById(id).value;
}

// update database
async function addPart(partNum, cycle, setup, note, tools) {
  try {
    await setDoc(doc(db, "parts", partNum), {
      number: partNum,
      cycle: cycle,
      setup: setup,
      note: note,
      tools: tools
    });
    console.log("Document written with ID: ", partNum);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}