'use strict';

var strips = require('./strips');

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

document.addEventListener('DOMContentLoaded', function() {
  var mainElem = document.getElementById('main');
  var dropTarget = document.getElementById('drop-target');
  dropTarget.addEventListener('dragover', function(e){ e.preventDefault(); }, true);
  dropTarget.addEventListener('drop', function(e) {
    e.preventDefault();
    loadImageFromFile(e.dataTransfer.files[0], function(image) {
      console.log('Loaded image ' + image.width + 'x' + image.height);

      var canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;

      mainElem.insertBefore(canvas, dropTarget);

      var ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, image.width, image.height);
      var imageData = ctx.getImageData(0, 0, image.width, image.height);
      console.log('Extracted ' + imageData.data.length + ' bytes of image data');

      console.log('Sampling ...');
      var testStrips = new strips.SimpleVerticalStrips(image.width, image.height, 40, 100);
      var polys = testStrips.sampleToPolys(imageData, 1);
      // console.log('Sampled to polys:', polys);
      console.log('Finished sampling');
      renderPolys(canvas, polys);
    });
  }, true);
});
