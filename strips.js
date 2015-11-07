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

function SimpleVerticalStrips(width, height, numStrips, stripRes) {
  this.width = width;
  this.height = height;
  this.numStrips = numStrips;
  this.stripRes = stripRes;
}

SimpleVerticalStrips.prototype.sampleToPolys = function(imageData, density) {
  var stripWidth = this.width/this.numStrips;
  var stripHalfwidth = 0.5*stripWidth;
  var du = this.height/this.stripRes;
  var hdu = 0.5*du;
  var _this = this;

  function sampleHalfstrip(cx, voff) {
    var result = [];

    // First point is special
    var val = sampleQuad(imageData, density,
      {x: cx, y: 0},
      {x: cx + voff, y: 0},
      {x: cx + voff, y: hdu},
      {x: cx, y: hdu}
    );
    result.push({x: cx + val*voff, y: 0});

    for (var i = 1; i < _this.stripRes; i++) {
      var ycent = i*du;
      var val = sampleQuad(imageData, density,
        {x: cx, y: ycent - hdu},
        {x: cx + voff, y: ycent - hdu},
        {x: cx + voff, y: ycent + hdu},
        {x: cx, y: ycent + hdu}
      );
      result.push({x: cx + val*voff, y: ycent});
    }

    // Last point is special
    var val = sampleQuad(imageData, density,
      {x: cx, y: _this.height - hdu},
      {x: cx + voff, y: _this.height - hdu},
      {x: cx + voff, y: _this.height},
      {x: cx, y: _this.height}
    );
    result.push({x: cx + val*voff, y: _this.height});

    return result;
  }

  var polys = [];
  for (var s = 0; s < this.numStrips; s++) {
    var cx = (s + 0.5)*stripWidth;

    var leftPoints = sampleHalfstrip(cx, -stripHalfwidth);
    var rightPoints = sampleHalfstrip(cx, stripHalfwidth);
    rightPoints.reverse();
    polys.push(leftPoints.concat(rightPoints));
  }

  return polys
};

module.exports = {
  SimpleVerticalStrips: SimpleVerticalStrips,
};
