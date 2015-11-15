'use strict';

function dist(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function randPointInTri(a, b, c) {
  var j = Math.random();
  var k = Math.random();

  if ((j + k) > 1) {
    j = 1 - j;
    k = 1 - k;
  }

  return {
    x: a.x + j*(b.x - a.x) + k*(c.x - a.x),
    y: a.y + j*(b.y - a.y) + k*(c.y - a.y),
  };
}

function triArea(a, b, c) {
  return Math.abs(0.5*(-b.x*a.y + c.x*a.y + a.x*b.y - c.x*b.y - a.x*c.y + b.x*c.y));
}

function randPointsInQuad(density, a, b, c, d) {
  var abcArea = triArea(a, b, c);
  var cdaArea = triArea(c, d, a);
  var totalArea = abcArea + cdaArea;
  var abcFrac = abcArea/totalArea;

  var n = Math.round(density*totalArea);
  var result = [];

  for (var i = 0; i < n; i++) {
    if (Math.random() < abcFrac) {
      result.push(randPointInTri(a, b, c));
    } else {
      result.push(randPointInTri(c, d, a));
    }
  }

  return result;
}

module.exports = {
  dist: dist,
  randPointsInQuad: randPointsInQuad,
};
