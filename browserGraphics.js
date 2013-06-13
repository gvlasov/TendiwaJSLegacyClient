var Graphics;
(function() {
	var instance;
	/**
	 * @singletone
	 * This object does two things: manages caching of images
	 * and does some non-trivial canvas manipulation.
	 * 
	 * Graphics provides two types of preloading: cache and stored images.
	 * Cache {@link Graphics#buildImageCache} downloads images and
	 * saves them only to browser cache. Unlike cache, storing 
	 * {@link Graphics#storeImages} and {@link Graphics#getImage}
	 * does the same that cache does _plus_ it stores Image objects
	 * in Graphics singletone for further usage. Store mechanism is used to draw not yet
	 * loaded images on canvas — don't use if for other purposes.
	 */
	function BrowserGraphics() {
		if (typeof instance !== "undefined") {
			return instance;
		}
		var imageDatas = {}; // Image data
		var storedImages = {
			floors: {},
			chardoll: {}
		};
		var imagesStaticData = StaticData.getRawClass("images");
		var bufCanvas; // A buffer context of a canvas where we put Images to
		               // save their ImageData.
		var floorImages = {}; // A 5-dimensional hash-map used to store ImageData of floor tiles
		                      // that are made of a central tile and transitions to 4 neighbors 
		var sharedInstance = {};
		Object.defineProperty(sharedInstance, "images", {
			value: storedImages,
			writable: false,
			configurable: false,
			enumerable: true
		});
		(function() {
		// Create canvas and set its width and height to fit the biggest image
			var canvas = document.createElement("canvas");
			var w = 0, h = 0, d;
			for (var i in storedImages) {
				for (var j in storedImages[i]) {
					d = imagesStaticData[i][j];
					if (w < d.w) {
						w = d.w;
					}
					if (h < d.h) {
						h = d.h;
					}
				}
			}
			bufContext = canvas.getContext("2d");
		});
		/**
		 * Caches all image files mentioned in StaticData.getRawClass("images")
		 * This loads images into browser's memory, but doesn't create javascript
		 * objects for them.
		 *
		 * Index in the raw class is a folder name, value is an array of file names without extension
		 * (it is always .png).
		 * 
		 * Fires event "imageCacheBuilt" when all images are loaded.
		 */
		 Object.defineProperty(this, "buildImageCache", {
			value: function() {
				var imagesToLoad = 0; // Used in image caching
				var image;
				var floorVariants = [
					"0000",
					"0001",
					"0010",
					"0011",
					"0100",
					"0101",
					"0110",
					"0111",
					"1000",
					"1001",
					"1010",
					"1011",
					"1100",
					"1101",
					"1110",
					"1111"
				];
				var otherFolders = ["chardoll", "particles", "objects"];
				function imageOnLoad() {
					if (--imagesToLoad === 0) {
						Events.fire("imageCacheBuilt");
					}
				};
				return; 
				// Caching floor images
				for (var i in imagesStaticData.floors) {
					for (var j=0, l=imagesStaticData.floors[i]; j<l; j++) {
						image = new Image();
						image.onload = imageOnLoad;
						image.src = "./images/floors/"+i+"_"+imagesStaticData.terrain[j]+".png";
					}
				}
				// Caching wall images
				for (var i=1, l=imagesStaticData.walls; i<l; i++) {
					for (var j=0; j<16; j++) {
						image = new Image();
						image.onload = imageOnLoad;
						image.src = "./images/walls/"+i+"_"+floorVariants[j]+".png";
					}
				}
				// Caching everything else
				for (var i in otherFolders) {
					for (var j=0, l=imagesStaticData[otherFolders[i]].length; i<l; j++) {
						var image = new Image();
						image.src = "./images/"+otherFolders[i]+"/"+imagesStaticData[otherFolders[i]][j]+".png";
						image.onload = imageOnLoad;
					}
				}
			},
			writable: false,
			configurable: false,
			enumerable: true
		 });
		/**
		 * @name Graphics#cacheImageData
		 * 
		 * Caches images and builds their ImageData for usage in canvas 
		 * contexts. As a result ImageData from each image in a particular 
		 * folder will be saved for further use.
		 * 
		 * @param {string} folder Name of folder. This should match folder 
		 * 		names in StaticData.getRawClass("images") ang in .images/ 
		 * 		directory.
		 * @returns {Image} 
		 * @see Graphics#storeImages
		 */
		Object.defineProperty(this, "cacheImageData", {
			value: function(folder) {
				var imagesToLoad = 0; // Increases with each requested image,
				                      // desreases with each loaded image.
				for (var i in imagesStaticData[folder]) {
					imagesToLoad++;
					var imgdata = imagesStaticData[folder][i];
					var image = new Image();
					image.src = "./images/"+folder+"/"+imgdata.filename+".png";
					image.onload = (function(w, h) {
						return function() {
							bufContext.clear();
							bufContext.drawImage(image, 0, 0, w, h);
							if (--imagesToLoad === 0) {
								imageDataPreloaded = true;
								if (imagesPreloaded) {
									Events.fire("imagesCached");
								}
							}
						}
					})(imgdata.w, imgdata.h);
				}
			},
			writable: false,
			configurable: false,
			enumerable: true
		});
		function getImage(folder, filename, cached) {
			if (typeof storedImages[folder][filename] === "undefined") {
				storedImages[folder][filename] = new Image();
			}
		}
		/**
		 * @name Graphics#setPixel
		 * Sets a particular pixel's color and alpha-channel in ImageData object
		 * 
		 * @param {ImageData} imageData What is returned by CanvasRenderingContext2D#getImageData
		 * @param {number} x Coordinates of pixel
		 * @param {number} y
		 * @param {array} color Pixel's color and alpha channel coded as [r, g, b, a]
		 */
		Object.defineProperty(this, "setPixel", {
			value: function setPixel(imageData, x, y, color) {
				// Установить цвет пикселя в ImageData
				// imageData - объект ImageData
				// color - [r,g,b,a]
				var r = color[0];
				var g = color[1];
				var b = color[2];
				var a = color[3];
				imageData.data[(x + y * imageData.width) * 4] = r;
				imageData.data[(x + y * imageData.width) * 4 + 1] = g;
				imageData.data[(x + y * imageData.width) * 4 + 2] = b;
				imageData.data[(x + y * imageData.width) * 4 + 3] = a;
			},
			writable: false,
			configurable: false,
			enumerable: true
		});
		/**
		 * @name Graphics#getPixel
		 * 
		 * From an ImageData returns color and alpha channel of a particular
		 * pixel
		 * 
		 * @param {ImageData} imageData What is returned by CanvasRenderingContext2D#getImageData
		 * @param {number} x Coordinates of pixel
		 * @param {number} y
		 * @returns {array} Pixel's color and alpha channel coded as [r, g, b, a]
		 */
		Object.defineProperty(this, "getPixel", {
			value: function getPixel(imageData, x, y) {
				// Получить цвет пикселя
				// Формат: [r,g,b]
				return [
					imageData.data[(x + y * imageData.width) * 4],
					imageData.data[(x + y * imageData.width) * 4 + 1],
					imageData.data[(x + y * imageData.width) * 4 + 2],
					imageData.data[(x + y * imageData.width) * 4 + 3]
				];
			},
			writable: false,
			configurable: false,
			enumberable: true
		});
		/**
		 * @name Graphics#getTransition
		 * 
		 * Builds ImageData that contains a smooth transition from a tile of one
		 * type into a tile of another type
		 * 
		 * @param {number} floorId Id of floor in the cell.
		 * @param {number[]} neighborIds of neighbor tiles. An array of four integers.
		 *		First one is the one from north side, second — from east side and so on. 
		 * 
		 * @return {ImageData} ImageData object with smoothly appearing pixels from one side.
		 *		This is the same object provided by fromImageData argument, but altered.
		 */
		Object.defineProperty(this, "getTransition", {
			value: function getTransition(floorId, neighborIds) {
				// At first it as the hash-map, after the loop it will be either ImageData or undefined.
				var floorImage = floorImages[floorId][0]; 
				for (var i=0; i<5; i++) {
				// Search for each index in hash-map of generated images
					floorImage = floorImages[neighborIds[i]][0];
					if (typeof floorImage === "undefined") {
					// If one of indexes was not present, then floorImage is not generated,
					// so if will be generated in this method.
						break;
					}
				}
				if (i === 5) {
				// If an image of such tile was already used (and thus was generated and 
				// cached), return the cached image
					return floorImage;
				} else {
				// If an image of such tile was not generated and cached yet,
				// generate and cache it
					// From now on floorImage variable is supposed to contain another image —
					// the base (unmodified) image of floor at 
					if (typeof (floorImage = storedImages["floors"][floorId][0]) === "undefined") {
						throw new Error("Image of floor "+floorId+" was not preloaded");
					}
					bufContext.drawImage(floorImage, 0, 0);
					var imageData = bufContext.getImageData(0, 0, 32, 32);
					for (var i=0; i<4; i++) {				
						if (neighborIds[i] !== floorId) {
						// Check each side of
							if (direction === 0) {
							// Up
								var iMin = 0, iMax = 32, jMin = 0, jMax = 4;
							} else if (direction === 1) {
							// Right
								var iMin = 28, iMax = 32, jMin = 0,	jMax = 32;
							} else if (direction === 2) {
							// Down
								var iMin = 0, iMax = 32, jMin = 28, jMax = 32;
							} else if (direction === 3) {
							// Left
								var iMin = 0, iMax = 4, jMin = 0, jMax = 32;
							}
							for (var i=iMin; i<iMax; i++) {
								for (var j=jMin; j<jMax; j++) {
									var chance; // What is the chance a certain pixel on 
												// initial image will be substituted with a
												// pixel from the neighbor image.
									// Less inherited pixels will be closer to the center of
									// the initial image, more further from the center
									if (i === 0 || i === 32 || j === 0 || j === 32) {
										chance = 20;
									} else if (i === 1 || i === 31 || j === 1 || j === 31) {
										chance = 60;
									} else if (i === 2 || i === 30 || j === 2 || j === 30) {
										chance = 80;
									} else {
										chance = 90;
									}
									if (Math.floor(Math.random()*100) < chance) {
										continue;
									}
									/* */ // Functions can be unwrapped
									this.setPixel(imageData, i, j, this.getPixel(floorImages, i, j));
								}
								j = 0;
							}
						}
					}
					// Save the generated ImageData and return it.
					return floorImages
						[floorId]
						[neighborIds[0]]
						[neighborIds[1]]
						[neighborIds[2]]
						[neighborIds[3]] = bufCanvas.getImageData(
								viewIndent.left,
								viewIndent.top,
								32,
								32
							);
				}
			},
			writable: false,
			configurable: false,
			enumerable: true
		});
		/**
		 * @name Graphics#getImage
		 * 
		 * Provides access to stored Image obects. To ge
		 * 
		 * @param {string} folder Folder name in ./images
		 * @param {string} filename Filename in ./images/folder without
		 *		extension (slways is .png)
		 * @returns {HTMLImageElement} Cached Image element. Note that
		 * 		the object returned by this method should not be changed —
		 *		method doesn't create a new instance of Image, but returns
		 * 		a stored instance. So don't change .src or .width/.height or 
		 * 		whatever of what is returned by this method.
		 */
		Object.defineProperty(this, "getImage", {
			value: function getImage(folder, filename) {
				if (typeof storedImages[folder][filename] === "undefined") {
					throw new Error("Image ./images/"+folder+"/"+filename+".png is not preloaded");
				}
				return storedImages[folder][filename];
			},
			writable: false,
			configurable: false,
			enumerable: true
		});
		/**
		 * @name Graphics#storeImages
		 *
		 * Saves HTMLImageElement of particular images in Graphics singletone.
		 * Unlike {@link Graphics#buildImageCache}, this method not only
		 * downloads images to browser cache, but also creatse a usable 
		 * javascript instance of image.
		 * 
		 * Store mechanism is used to draw not yet
		 * loaded images on canvas — don't use if for other purposes.
		 * 
		 * After this method is used with some images, {@link Graphics#getImage}
		 * can be used with these images.
		 *
		 * @param {object} imageList Objects where indexes are folder names
		 * 		form ./images folder and values ara arrays of ids corresponding to filenames
		 * 		in those folders. Note that in case of floors or walls, though their
		 * 		files have not only ids in filename, but also some _data, you still
		 * 		proveide only id — all the images corresponding to that id will be
		 * 		loaded simultaneously.
		 * @param {function} callback Callback function which is called once all the 
		 * 		images are loaded.
		 */
		Object.defineProperty(this, "storeImages", {
			value: function storeImage(imageList, callback) {
				var onload = function() {
					if (--storedImages === 0) {
						callback();
					}
				};
				var storedImages = 0; // Amount of stored images
				if (typeof imageList.chardoll !== "undefined") {
					storeImages += imageList.chardoll.length;
				}
				if (typeof imageList.floors !== "undefined") {
					for (var i=0, l=imageList.floors.length; i<l; i++) {
					// Each flor type has several images — they are stored together.
						storedImages += imagesStaticData.floors[imageList.floors[i]];
					}
				}
				if (typeof imageList.floors !== "undefined") {
				// Storing floors
					for (var i=0, l=imageList.floors.length; i<l; i++) {
						for (var j=0, k=imagesStaticData.floors[imageList.floors[i]]; j<k; j++) {
							storedImages.floors[imageList.floors[i]][j];
						}
					}
				}
				if (typeof imageList.chardoll !== "undefined") {
				// Storying everything else
					for (var i=0, l=imageList.chardoll.length; i<l; i++) {
						var image = storedImages
							.chardoll
							[imageList.chardoll[i]]
							[imageList.chardoll[i]] = new Image();
						image.onload = onload;
						image.src = "./images/"+fodler+"/"+filename+".png";
					}
				}
			},
			writable: false,
			configurable: false,
			enumerable: true
		});
		Object.defineProperty(this, "getInstance", {
			value: function getInstance() {
				return sharedInstance;
			},
			writable: false,
			configurable: false,
			enumerable: true
		});
		Object.defineProperty(this, "", {
			value: function getInstance() {

			},
			writable: false,
			configurable: false,
			enumerable: true
		});
		return instance = this;
	}
	window.Graphics = new BrowserGraphics();
})();
