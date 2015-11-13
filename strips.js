'use strict';

var geom = require('./geom');

function sampleQuad(imageData, density, a, b, c, d) {
  var points = geom.randPointsInQuad(density, a, b, c, d);

  if (points.length === 0) {
    throw new Error('No points');
  }

  var totalR = 0;
  for (var i = 0; i < points.length; i++) {
    var p = points[i];
    var idx = Math.floor(p.x) + Math.floor(p.y)*imageData.width;
    totalR += imageData.data[4*idx];
  }

  return totalR/(points.length*255);
}

function SimpleVerticalStrips(width, height, numStrips, stripRes, minCutSpacing, minMaterialWidth) {
  this.width = width;
  this.height = height;
  this.numStrips = numStrips;
  this.stripRes = stripRes;
  this.stripWidth = this.width/this.numStrips;
  this.stripHalfwidth = 0.5*this.stripWidth;
  this.minCutHalfwidth = 0.5*minCutSpacing;
  this.maxCutHalfwidth = this.stripHalfwidth - 0.5*minMaterialWidth;
}

SimpleVerticalStrips.prototype.sampleToPolys = function(imageData, density) {
  var du = this.height/this.stripRes;
  var hdu = 0.5*du;
  var _this = this;
  var shw = this.stripHalfwidth; // alias

  function constrainCutHalfwidth(hw) {
    if (hw < _this.minCutHalfwidth) {
      return _this.minCutHalfwidth;
    } else if (hw > _this.maxCutHalfwidth) {
      return _this.maxCutHalfwidth;
    } else {
      return hw;
    }
  }

  function sampleHalfstrip(cx, xdir) {
    var result = [];

    // First point is special
    var val = sampleQuad(imageData, density,
      {x: cx, y: 0},
      {x: cx + shw, y: 0},
      {x: cx + shw, y: hdu},
      {x: cx, y: hdu}
    );
    result.push({x: cx + xdir*constrainCutHalfwidth(val*shw), y: 0});

    for (var i = 1; i < _this.stripRes; i++) {
      var ycent = i*du;
      var val = sampleQuad(imageData, density,
        {x: cx, y: ycent - hdu},
        {x: cx + shw, y: ycent - hdu},
        {x: cx + shw, y: ycent + hdu},
        {x: cx, y: ycent + hdu}
      );
      result.push({x: cx + xdir*constrainCutHalfwidth(val*shw), y: ycent});
    }

    // Last point is special
    var val = sampleQuad(imageData, density,
      {x: cx, y: _this.height - hdu},
      {x: cx + shw, y: _this.height - hdu},
      {x: cx + shw, y: _this.height},
      {x: cx, y: _this.height}
    );
    result.push({x: cx + xdir*constrainCutHalfwidth(val*shw), y: _this.height});

    return result;
  }

  var polys = [];
  for (var s = 0; s < this.numStrips; s++) {
    var cx = (s + 0.5)*this.stripWidth;

    var leftPoints = sampleHalfstrip(cx, -1);
    var rightPoints = sampleHalfstrip(cx, 1);
    rightPoints.reverse();
    polys.push(leftPoints.concat(rightPoints));
  }

  return polys
};

module.exports = {
  SimpleVerticalStrips: SimpleVerticalStrips,
};
