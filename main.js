class MyHeader extends HTMLElement {
	connectedCallback() {
	this.innerHTML = `
		<header>
      		<h1>
				<a href="../index.html" class="homeButton">&#x2694 LRM &#x2694</a>
			</h1>
			<p>
   				<br>
				<a href="../about.html">about</a> // 
				<a href="../tools.html">tools</a> //
				<a href="../fungi.html">fungi</a> //
				<a href="../music.html">music</a> // 
				<a href="../artwork.html">artwork</a>
				
    		</p>
			<br><br><br><br>
    	</header>
	`
	}
}

customElements.define('my-header', MyHeader)

class MyFooter extends HTMLElement {
	connectedCallback() {
	this.innerHTML = `
		<footer>
			<p></p>
		</footer>
	`
	}
}

customElements.define('my-footer', MyFooter)

