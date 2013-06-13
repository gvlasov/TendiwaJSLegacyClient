function LoadingScreen() {
	var rootElement = document.createElement("div");
	this.getRootElement = function() {
		return rootElement;
	};
}
LoadingScreen.prototype.build = function(func) {
	func.apply(this);
};
