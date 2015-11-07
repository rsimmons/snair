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

document.addEventListener('DOMContentLoaded', function() {
  var dropTarget = document.getElementById('drop-target');
  dropTarget.addEventListener('dragover', function(e){ e.preventDefault(); }, true);
  dropTarget.addEventListener('drop', function(e) {
    e.preventDefault();
    loadImageFromFile(e.dataTransfer.files[0], function(image) {
      console.log('Loaded image ' + image.width + 'x' + image.height);

      var canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, image.width, image.height);
      var imageData = ctx.getImageData(0, 0, image.width, image.height);
      console.log('Extracted ' + imageData.data.length + ' bytes of image data');

      console.log('Sampling ...');
      var testStrips = new strips.SimpleVerticalStrips(image.width, image.height, 1, 1);
      var polys = testStrips.sampleToPolys(imageData, 0.001);
      console.log('Sampled to polys:', polys);
    });
  }, true);
});
