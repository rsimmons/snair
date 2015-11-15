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
  this.stripWidth = this.width/this.numStrips;
  this.stripHalfwidth = 0.5*this.stripWidth;
}

SimpleVerticalStrips.prototype.sampleToPolys = function(imageData, density, minCutSpacing, minCutBehavior, minMaterialWidth, beamWidth) {
  var du = this.height/this.stripRes;
  var hdu = 0.5*du;
  var _this = this;
  var shw = this.stripHalfwidth; // alias

  var minCutHalfwidth = 0.5*minCutSpacing;
  var maxCutHalfwidth = shw - (0.5*minMaterialWidth + 0.5*beamWidth);

  function adjustCutHalfwidth(hw) {
    hw -= 0.5*beamWidth;
    if (hw < 0) {
      return 0;
    } else if ((minCutBehavior === 'clamp') && (hw < minCutHalfwidth)) {
      return minCutHalfwidth;
    } else if (hw > maxCutHalfwidth) {
      return maxCutHalfwidth;
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
    result.push({x: cx + xdir*adjustCutHalfwidth(val*shw), y: 0});

    for (var i = 1; i < _this.stripRes; i++) {
      var ycent = i*du;
      var val = sampleQuad(imageData, density,
        {x: cx, y: ycent - hdu},
        {x: cx + shw, y: ycent - hdu},
        {x: cx + shw, y: ycent + hdu},
        {x: cx, y: ycent + hdu}
      );
      result.push({x: cx + xdir*adjustCutHalfwidth(val*shw), y: ycent});
    }

    // Last point is special
    var val = sampleQuad(imageData, density,
      {x: cx, y: _this.height - hdu},
      {x: cx + shw, y: _this.height - hdu},
      {x: cx + shw, y: _this.height},
      {x: cx, y: _this.height}
    );
    result.push({x: cx + xdir*adjustCutHalfwidth(val*shw), y: _this.height});

    return result;
  }

  var polys = [];
  for (var s = 0; s < this.numStrips; s++) {
    var cx = (s + 0.5)*this.stripWidth;

    var leftPoints = sampleHalfstrip(cx, -1);
    var rightPoints = sampleHalfstrip(cx, 1);

    var accumLeftPoints = [];
    var accumRightPoints = [];
    var inPoly = false;
    function closeAndEmit() {
      if (inPoly) {
        if (accumLeftPoints.length > 1) {
          accumRightPoints.reverse();
          polys.push(accumLeftPoints.concat(accumRightPoints));
        }
        inPoly = false;
        accumLeftPoints = [];
        accumRightPoints = [];
      }
    }
    for (var i = 0; i < leftPoints.length; i++) {
      var lp = leftPoints[i];
      var rp = rightPoints[i];

      var include;
      if (minCutBehavior === 'cull') {
        include = (geom.dist(lp, rp) >= minCutSpacing);
      } else {
        include = true;
      }
      if (include) {
        // Sufficiently wide, so add this to poly or start new poly
        if (!inPoly) {
          inPoly = true;
        }
        accumLeftPoints.push(lp);
        accumRightPoints.push(rp);
      } else {
        // Not sufficiently wide, so close any open poly or just move on
        closeAndEmit();
      }
    }
    closeAndEmit();
  }

  return polys
};

module.exports = {
  SimpleVerticalStrips: SimpleVerticalStrips,
};
