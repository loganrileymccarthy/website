class MyHeader extends HTMLElement {
	ConnectedCallback() {
	this.innerHTML = `
		<header>
        		<h1>
				<a href="../index.html" style="color:white;text-decoration:none;">&#x2694 LRM &#x2694</a>
			</h1>
			<h2>
				<a href="../music.html">music</a> // 
				<a href="../artwork.html">artwork</a> // 
				<a href="../slugshots.html">slugshots</a> // 
				<a href="../for-sale.html">for sale</a> // 
				<a href="../workout.html">workout</a> // 
				<a href="../running.html">running PRs</a>
        		</h2>
    		</header>
	`
	}
}

customElements.define('my-header', MyHeader)

class MyFooter extends HTMLElement {
	ConnectedCallback() {
	this.innerHTML = `
		<footer>
			2025
		</footer>
	`
	}
}

customElements.define('my-footer', MyFooter)

