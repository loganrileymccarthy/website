class MyHeader extends HTMLElement {
	connectedCallback() {
	this.innerHTML = `
		<header>
        	<h1 href="../index.html">&#x2694 LRM &#x2694</h1>
			<h2>
   				<br>
				<a href="../music.html">music</a> // 
				<a href="../artwork.html">artwork</a> // 
				<a href="../tools.html">tools</a> // 
    				<a href="../slugshots.html">slugshots</a> // 
				<a href="../workout.html">workout</a> // 
				<a href="../running.html">running PRs</a>
				
        		</h2>
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

