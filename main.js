class MyHeader extends HTMLElement {
	connectedCallback() {
	this.innerHTML = `
		<header>
      		<h1>
				<a href="../index.html" class="homeButton">&#x2694 LRM &#x2694</a>
			</h1>
			<p>
				<a href="../about.html">about</a> // 
				<a href="../tools.html">tools</a> //
				<a href="../fungi.html">fungi</a> //
				<a href="../music.html">music</a> // 
				<a href="../artwork.html">artwork</a>
    		</p>
    	</header>
	`
	}
}

customElements.define('my-header', MyHeader)

class MyFooter extends HTMLElement {
	connectedCallback() {
	this.innerHTML = `
		<footer>
			<p>
                <label style="font-size: 11px;">
                    <input type="checkbox" id="darkModeToggleGlobal" checked> Dark Mode
                </label>
            </p>
		</footer>
	`
    
    // Add logic after elements are created
    this.querySelector('#darkModeToggleGlobal').addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.remove("light-mode");
        } else {
            document.body.classList.add("light-mode");
        }
    });

	}
}

customElements.define('my-footer', MyFooter)