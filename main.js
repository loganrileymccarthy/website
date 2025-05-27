class MyHeader extends HTMLElement {
	connectedCallback() {
	this.innerHTML = `
		<header>
        		<h1>
				<a href="../index.html" style="color:white;text-decoration:none;">&#x2694 LRM &#x2694</a>
			</h1>
			<h2>
   				<br>
				
				<a href="../artwork.html">artwork</a> // 
				<a href="../slugshots.html">slugshots</a> // 
				
				<a href="../workout.html">workout</a> // 
				<a href="../running.html">running PRs</a> // 
				<a href="../yahtzee.html">yahtzee</a>
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

