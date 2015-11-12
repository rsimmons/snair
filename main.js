'use strict';

var strips = require('./strips');

var currentImage; // image element, hidden
var currentPolys; // specifically these are cut-strip polygons in pixel coords relative to currentImage

function loadImageFromFile(file, cb) {
  // Prevent any non-image file type from being read.
  if (!file.type.match(/image.*/)) {
    console.log('The dropped file is not an image: ', file.type);
    return;
  }

  var reader = new FileReader();
  reader.onload = function(e) {
    var image = new Image();
    image.onload = function() {
      cb(image);
    };
    image.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderPolys(canvas, polys) {
  var ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  for (var i = 0; i < polys.length; i++) {
    var poly = polys[i];
    ctx.beginPath();
    for (var j = 0; j < poly.length; j++) {
      var p = poly[j];
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
  }
}

function polysToSVG(image, polys, forPreview) {
  var framePadFrac = 0.05;
  var imageMaxDim = Math.max(image.width, image.height);
  var framePadPx = framePadFrac*imageMaxDim;
  var withFrameWidthPx = image.width + 2*framePadPx;
  var withFrameHeightPx = image.height + 2*framePadPx;

  var svgWidth, svgHeight;
  var viewBox;
  var polyScale;
  var polyOffset;
  var cutStrokeWidth;
  var frameCutX, frameCutY, frameCutWidth, frameCutHeight;
  if (forPreview) {
    // For web preview
    polyScale = 1.0;
    polyOffset = 0;
    cutStrokeWidth = '1px';
  } else {
    // For real laser cutting
    // We give an extra mm of safe area padding beyond what Ponoko says, so we do 6mm instead of 5mm
    // These safeXXX vars are in mm units
    var safeAreaWidth = 788;
    var safeAreaHeight = 382;
    var safeOffset = 6;

    polyScale = Math.min(safeAreaWidth/withFrameWidthPx, safeAreaHeight/withFrameHeightPx);
    polyOffset = {
      x: safeOffset + framePadPx*polyScale,
      y: safeOffset + framePadPx*polyScale,
    };

    var totalWidth = polyScale*withFrameWidthPx + 2*safeOffset;
    var totalHeight = polyScale*withFrameHeightPx + 2*safeOffset;
    svgWidth = totalWidth + 'mm';
    svgHeight = totalHeight + 'mm';
    viewBox = '0 0 ' + totalWidth + ' ' + totalHeight;

    cutStrokeWidth = '0.01';

    frameCutX = safeOffset;
    frameCutY = safeOffset;
    frameCutWidth = polyScale*withFrameWidthPx;
    frameCutHeight = polyScale*withFrameHeightPx;
  }

  var polysPathData = '';
  for (var i = 0; i < currentPolys.length; i++) {
    var poly = currentPolys[i];

    for (var j = 0; j < poly.length; j++) {
      var p = poly[j];
      var tp = {
        x: p.x*polyScale + polyOffset.x,
        y: p.y*polyScale + polyOffset.y,
      };

      if (j === 0) {
        polysPathData += 'M'; // moveto absolute
      } else {
        polysPathData += 'L'; // lineto absolute
      }
      polysPathData += tp.x.toFixed(4) + ',' + tp.y.toFixed(4);
    }
    polysPathData += 'z'; // closepath
  }

  var cutColor = 'rgb(0,0,255)';
  var exportText = '';
  exportText += '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n';
  exportText += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="' + svgWidth + '" height="' + svgHeight + '" viewBox="' + viewBox + '">\n';
  exportText += '  <path fill="none" stroke="' + cutColor + '" stroke-width="' + cutStrokeWidth + '" d="' + polysPathData + '"/>\n';
  exportText += '  <rect x="' + frameCutX + '" y="' + frameCutX + '" width="' + frameCutWidth + '" height="' + frameCutHeight + '" fill="none" stroke="' + cutColor + '" stroke-width="' + cutStrokeWidth + '"/>\n';
  exportText += '</svg>';

  return exportText;
}

function setCurrentImage(image) {
    currentImage = image;

    console.log('Loaded image ' + image.width + 'x' + image.height);

    var canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    var mainElem = document.getElementById('main');
    mainElem.insertBefore(canvas, mainElem.firstChild);

    var ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);
    var imageData = ctx.getImageData(0, 0, image.width, image.height);
    console.log('Extracted ' + imageData.data.length + ' bytes of image data');

    console.log('Sampling ...');
    var testStrips = new strips.SimpleVerticalStrips(image.width, image.height, 118, 200);
    currentPolys = testStrips.sampleToPolys(imageData, 1);
    console.log('Finished sampling');
    renderPolys(canvas, currentPolys);
}

document.addEventListener('DOMContentLoaded', function() {
  var dropTarget = document;
  dropTarget.addEventListener('dragover', function(e){ e.preventDefault(); }, true);
  dropTarget.addEventListener('drop', function(e) {
    e.preventDefault();
    loadImageFromFile(e.dataTransfer.files[0], function(image) {
      setCurrentImage(image);
    });
  }, true);

  document.getElementById('preview-link').addEventListener('click', function(e) {
    if (!currentPolys) {
      return;
    }

    var svgData = polysToSVG(currentImage, currentPolys, true);

    this.href = 'data:image/svg+xml,' + encodeURIComponent(svgData);
  }, false);

  document.getElementById('download-link').addEventListener('click', function(e) {
    if (!currentPolys) {
      return;
    }

    var svgData = polysToSVG(currentImage, currentPolys, false);

    this.href = 'data:image/svg+xml,' + encodeURIComponent(svgData);
  }, false);
});
