/* Copyright (c) 2022 Marko Praakli. See the file LICENSE for copying permission. */
function RGBWLed(pins, state, color, isAnode) {
  this.pins = pins;
  this.isAnode = isAnode;
  this.pins.forEach(function (e) {pinMode(e, "output");});
  this.state = typeof state === "undefined" ? true : !!state;
  this.rgbwAnalog = [];
  this.intensity = 100;
  this.setColor(typeof color === "undefined" ? "FFFFFF" : color);
  this.intervalId = 0;
  this._write(true);
}
RGBWLed.prototype._map = function(x, in_min, in_max, out_min, out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
};
RGBWLed.prototype._write = function (stop) {
  if (stop) {this._stop();}
  var that = this;
  this.pins.forEach(function (e, i) {
    
    let val = that.state ? that._map(that.intensity, 0, 100, 0.0000000, that.rgbwAnalog[i]) : 0;
    
    analogWrite(e, val, { freq : 500 });
    
    console.log('RGBW led:', e, '-', val);
  });
};
RGBWLed.prototype._stop = function () {
  try {clearInterval(this.intervalId);} catch (e) { }
};
RGBWLed.prototype.setIntensity = function (intensity) {
  this.intensity = intensity;
};
RGBWLed.prototype.setColor = function (color) {
  for (var i = 0, s = -6; i < 3; i += 1, s += 2) {
    if(!this.isAnode){  
      this.rgbwAnalog[i] = E.clip(parseInt(color.substr(s, 2), 16), 0, 255) / 255;
    }
    else {
      this.rgbwAnalog[i] = 1-(E.clip(parseInt(color.substr(s, 2), 16), 0, 255) / 255);
    }
  }
  this._write();
};
RGBWLed.prototype.on = function () {
  this.state = true;
  this._write(true);
};
RGBWLed.prototype.off = function () {
  this.state = false;
  this._write(true);
};
RGBWLed.prototype.toggle = function () {
  this.state = !this.state;
  this._write();
};
RGBWLed.prototype.invert = function (x) {
  this.isAnode = x;
};
RGBWLed.prototype.getState = function () {
  return this.state;
};
RGBWLed.prototype.strobe = function (ms) {
  this._stop();
  var that = this;
  this.intervalId = setInterval(function () {
    that.toggle();
  }, typeof ms === "undefined" ? 100 : ms);
};

exports.connect = function (pins, state, color, isAnode) {return new RGBWLed(pins, state, color, isAnode);};
