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

function polysToSVG(image, polys, jobParams, forPreview) {
  var polyCutStyle;
  var frameCutStyle;
  if (forPreview) {
    // For web preview
    polyCutStyle = 'stroke="white" stroke-width="' + jobParams.beamWidth + '" fill="white"'; // simulate slight enlargement due to beam width
    frameCutStyle = 'stroke="none" fill="black"';
  } else {
    // For real laser cutting
    polyCutStyle = 'fill="none" stroke="' + jobParams.laserCutColor + '" stroke-width="' + jobParams.laserCutStrokeWidth + '"';
    frameCutStyle = polyCutStyle;
  }

  var polysPathData = '';
  for (var i = 0; i < currentPolys.length; i++) {
    var poly = currentPolys[i];

    for (var j = 0; j < poly.length; j++) {
      var p = poly[j];
      var tp = {
        x: p.x*jobParams.px2mm + jobParams.insetTranslation.x,
        y: p.y*jobParams.px2mm + jobParams.insetTranslation.y,
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

  var exportText = '';
  exportText += '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n';
  exportText += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="' + jobParams.totalWidth + 'mm" height="' + jobParams.totalHeight + 'mm" viewBox="0 0 ' + jobParams.totalWidth + ' ' + jobParams.totalHeight + '">\n';
  var polyCutText = '  <path ' + polyCutStyle + ' d="' + polysPathData + '"/>\n';
  var frameCutText = '  <rect ' + frameCutStyle + ' x="' + jobParams.frameCutX.toFixed(4) + '" y="' + jobParams.frameCutX.toFixed(4) + '" width="' + jobParams.frameCutWidth.toFixed(4) + '" height="' + jobParams.frameCutHeight.toFixed(4) + '"/>\n';
  if (forPreview) {
    exportText += frameCutText;
    exportText += polyCutText;
  } else {
    exportText += polyCutText;
    exportText += frameCutText;
  }
  exportText += '</svg>';

  return exportText;
}

function fillDerivedJobParams(sourceJobParams, image) {
  var p = sourceJobParams; // alias

  var imageMaxDim = Math.max(image.width, image.height);
  var framePadPx = p.framePadFrac*imageMaxDim;
  var withFrameWidthPx = image.width + 2*framePadPx;
  var withFrameHeightPx = image.height + 2*framePadPx;

  p.px2mm = Math.min(p.workAreaWidth/withFrameWidthPx, p.workAreaHeight/withFrameHeightPx);
  p.mm2px = 1.0/p.px2mm;
  p.insetTranslation = { // in mm
    x: p.workAreaInset + framePadPx*p.px2mm,
    y: p.workAreaInset + framePadPx*p.px2mm,
  };

  p.totalWidth = p.px2mm*withFrameWidthPx + 2*p.workAreaInset;
  p.totalHeight = p.px2mm*withFrameHeightPx + 2*p.workAreaInset;

  p.frameCutX = p.workAreaInset;
  p.frameCutY = p.workAreaInset;
  p.frameCutWidth = p.px2mm*withFrameWidthPx;
  p.frameCutHeight = p.px2mm*withFrameHeightPx;
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

    // Derive further job params now that we have image dimensions
    fillDerivedJobParams(testJobParams, image); 

    console.log('Sampling ...');
    var testStrips = new strips.SimpleVerticalStrips(image.width, image.height, 118, 200);
    currentPolys = testStrips.sampleToPolys(imageData, 1, testJobParams.mm2px*testJobParams.beamWidth, testJobParams.mm2px*testJobParams.minMaterialWidth, testJobParams.mm2px*testJobParams.beamWidth);
    console.log('Finished sampling');
    renderPolys(canvas, currentPolys);
}

// BEGIN JOB HARDCODE
var testJobParams = {
  framePadFrac: 0.05,
  // We give an extra mm of safe area padding beyond what Ponoko says, so we do 6mm instead of 5mm
  // These vars are in mm units
  workAreaWidth: 788,
  workAreaHeight: 382,
  workAreaInset: 6,
  beamWidth: 0.3, // Ponoko says 0.1-0.2mm on either side, so take average
  laserCutColor: 'rgb(0,0,255)',
  laserCutStrokeWidth: '0.01',
  minMaterialWidth: 1.0,
};
// END JOB HARDCODE

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

    var svgData = polysToSVG(currentImage, currentPolys, testJobParams, true);

    this.href = 'data:image/svg+xml,' + encodeURIComponent(svgData);
  }, false);

  document.getElementById('download-link').addEventListener('click', function(e) {
    if (!currentPolys) {
      return;
    }

    var svgData = polysToSVG(currentImage, currentPolys, testJobParams, false);

    this.href = 'data:image/svg+xml,' + encodeURIComponent(svgData);
  }, false);
});
