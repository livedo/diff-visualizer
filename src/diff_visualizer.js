DiffVisualizer = Class.create();
DiffVisualizer.prototype = {
/**
 * canvas: a canvas element
 * data: an array of the form [[key, [posval, negval]], ...]
 * options: dimensions, colors
 */
	initialize: function(canvas, data, options) {
		if (!canvas) throw "No canvas given!";
		if (!data) throw "No data given!";
		this.canvas = canvas;
		this.ctx = this.canvas.getContext('2d');
//		CanvasTextFunctions.enable(this.ctx);
		this.screenPosition = this.canvas.cumulativeOffset();
		this.data = data;

		options = options || {};
		// TODO: should the user be able to define dimensions here? 
		this.width = options.width || this.canvas.width;
		this.height = options.height || this.canvas.height;
		this.barWidth = options.barWidth || this.width/this.data.size(); // Set at one data.length'th of width
		this.xAxisPosition = this.height/2; // Set at half of height
		
		this.positiveColor = options.positiveColor || "#4d89f9";
		this.negativeColor = options.negativeColor || "#ff9988";

		this.xAxisStyle = options.xAxisStyle || '#ffffff';
//		this.xAxisWidth;
		this.gridLineColor = options.gridLineColor || "rgba(255,255,255,0.25)";

		this.onClick = options.onClick || Prototype.emptyFunction;
		
		var defaultLegend =  {
			boxFill: "rgba(10,10,10,0.9)",
			xOffset: 20,
			yOffset: 20,
			font: "sans",
			fontSize: 12.5,
			fontColor: "#ffffff",
			containerHeight: 60,
			containerWidth: 100
		}
		this.legend = $H(defaultLegend).merge(options.legend || {}).toObject(); // Not cool
console.log(this.legend);

		// Get max value from data to define scale if it's not defined
		this.scaleMax = options.scaleMax || this.data.max(function(record) { return record[1].max() })+1;

		// Create another canvas for the tooltip legend and position it correctly
		this.innerCanvas = new Element('canvas', {
			id: this.canvas.id+"_tooltip_legend_canvas", 
			height: this.height+200, 
			width: this.width+200
		});
		this.innerCanvas.setStyle({
			position: 'absolute',
			top: this.screenPosition.top+'px',
			left: this.screenPosition.left+'px',
			border: "0px solid #000", // DEBUG
			zIndex: '999'
		});
		document.body.insert(this.innerCanvas); // Insert to body
		this.innerCtx = this.innerCanvas.getContext('2d');
		CanvasTextFunctions.enable(this.innerCtx);
		
		this.innerCanvas.observe('mousemove', this.mouseMove.bindAsEventListener(this));
		
		this.render();
	}, 
	render: function() {
		this.ctx.strokeStyle = this.xAxisStyle;
		this.ctx.lineWidth = 0.5;
		this.ctx.beginPath();
		this.ctx.moveTo(0,this.xAxisPosition);
		this.ctx.lineTo(this.width,this.xAxisPosition);
		this.ctx.closePath();
		this.ctx.stroke();
		
		
		this.data.each(this.renderRecord.curry({
			positive: this.positiveColor,
			negative: this.negativeColor,
			gridline: this.gridLineColor
		}).bind(this));
	},
	renderRecord: function(colors,record, i) {
//DEBUG//console.log('rendering record ' + record);
		var label = record[0];
		var posHeight = (record[1][0]/this.scaleMax)*this.xAxisPosition;
		var negHeight = (record[1][1]/this.scaleMax)*this.xAxisPosition;
		var xPosition = i*(this.barWidth);
//DEBUG//console.log("ph:" + posHeight + " nh:" + negHeight + " xp:" + xPosition);
	    this.ctx.fillStyle = this.positiveColor;
	    this.ctx.fillRect (xPosition+1, this.xAxisPosition-1-posHeight, this.barWidth-4, posHeight);

	    this.ctx.fillStyle = this.negativeColor;
	    this.ctx.fillRect (xPosition+1, this.xAxisPosition+1, this.barWidth-4, negHeight);

		this.ctx.strokeStyle = this.gridLineColor;
		this.ctx.lineWidth = 0.5; // Fixed
		this.ctx.beginPath();
		this.ctx.moveTo(xPosition+this.barWidth-1,0);
		this.ctx.lineTo(xPosition+this.barWidth-1,this.height);
		this.ctx.closePath();
		this.ctx.stroke();
	},
	mouseMove: function(event) {
//		console.log(event.pointerX());				
		var positions = {top: event.pointerY()-this.screenPosition.top,
			 			 left: event.pointerX()-this.screenPosition.left}
		var record = this.data[parseInt(positions.left/this.barWidth)]; // Determine the record we are on
		// Clear whatever previous stuff
		this.innerCtx.clearRect(0,0,this.innerCanvas.width,this.innerCanvas.height); 
		
		if(record && (this.height>positions.top)) {
			var containerX = positions.left+this.legend.xOffset;
			var containerY = positions.top+this.legend.yOffset;
			var ctx = this.innerCtx; // For shorter syntax. Is this heavy?

			// Let's draw the highlights
			
			

			// Let's draw the offset lines
			ctx.strokeStyle = this.legend.boxFill; // "rgba(0,0,0,0.5)"; // Fixed
			ctx.lineWidth = 1.8; // TODO: to settings
			ctx.beginPath();
			ctx.moveTo(positions.left, positions.top); // cursor
			//curve to box top-right
			ctx.quadraticCurveTo(containerX, containerY, containerX+this.legend.containerWidth, containerY);
			ctx.lineTo(containerX,containerY); // line to box top-left
			ctx.lineTo(positions.left, positions.top); // line to cursor
			// curve to box bottom-left
			ctx.quadraticCurveTo(containerX, containerY, containerX, containerY+this.legend.containerHeight);
			ctx.lineTo(containerX,containerY); // line to box top-left
			// fill
			ctx.fillStyle = "rgba(60,60,60,0.8)";
			ctx.fill();
			ctx.closePath();
			ctx.stroke();

			// Let's draw the box
			ctx.lineCap = 'round';
			ctx.shadowColor = 'rgba(0, 0, 20, 0.63)';
		    ctx.shadowOffsetX = 4;
		    ctx.shadowOffsetY = 4;
			ctx.shadowBlur = 10;
		    ctx.fillStyle = this.legend.boxFill;
		    ctx.fillRect (containerX, containerY, this.legend.containerWidth, this.legend.containerHeight);
			var font = this.legend.font;
			var fontsize = this.legend.fontSize;
			var rowHeight = ctx.fontAscent(font, fontsize)+3;
			var padding = 4;
			
			// Let's draw the texts
			ctx.strokeStyle = this.legend.fontColor;
			ctx.drawText(font, fontsize, containerX+padding, containerY+rowHeight, record[0]);
			ctx.strokeStyle = this.positiveColor;
			ctx.drawText(font, fontsize, containerX+padding, containerY+rowHeight*2, "+"+record[1][0]);
			ctx.strokeStyle = this.negativeColor;
			ctx.drawText(font, fontsize, containerX+padding, containerY+rowHeight*3, "-"+record[1][1]);
		}
	},
	click: function(event) {
		this.onClick();
	},
	isInsideCanvas: function(event) {
		return false; // TODO: implement
	}
}
