// MCP32017I2CA4x4KPD9.js
// 
// https://espruino.microco.sm/api/v1/files/e9474e4809d42cf2aa0a28c9377a4c4987ee1b72.js
// http://forum.espruino.com/conversations/312487/#comment13951117
//
// MCP32917 (MCP32908) PortExpander driving
// 4x4 Keypad using interrupt approach for key down
//              and intervalled chack for key up 

/* simple (preferred) usage: -----

   I2C1.setup({scl:B8, sda:B9, bitrate:1000000});
   var kpd = new Kpd(function(keypad,key,upTime,pressTime){
                 console.log(key,"pressed for", pressTime);
               }).connect(I2C1,0,B0,A0).enable();
*/

// key pad config ----- (used Espruino-Wifi and built-in I2C)
/*                    but can run on soft I2C aa well.
var i2a  = I2C1 // i2c appliance portexpander is connected to
  , i2c  =   D21 // i2c clock
  , i2d  =   D22 // i2c data
  , i2s  = 100000 // i2c speed (bitrate per second 100/400/1700k)
  , pxa  =    0 // portexpander 3-bit address (0..7)
  , pxi  =   D16 // interrupt - required w/ setWatch
  , pxr  =   D17 // reset (active low, 'clean' alternatives work too)
  , dbnc =   10 // debounce [ms] - optional
  , uchk =  100 // upcheck [ms] - optional
  ;
*/
// KPD - Key PaD definition -----

// constructor
//
// - downCB - down event callback (null if none); parms:
//   - kpd  - keypad instance
//   - key  - key number 0..15
//   - time - time on down event (float from getTime())
// - upCB - up event callback (absent or null if none); parms:
//   - kpd  - keypad instance
//   - key  - key number 0..15
//   - time - time on up event (float from getTime())
//   - duration  - press duration time (float, diff of up - down)
//   - cancelled - truey when keypad got disabled while key down
// - (optional) debounce in ms - when is key to be considered stable 
// - (optional) upcheck in ms - when is key considered to be released
var Kpd = function(upCB,downCB,debounce,upcheck) {
  this.upCB     = upCB;
  this.downCB   = downCB;
  this.debounce = (debounce) ? debounce : 0;
  this.upcheck  = (upcheck) ? upcheck : 0;
  this.down     = false; // state / key pressed
  this.key      = -1;    // last key
  this.dwnT     = 0;     // getTime() of down event (press)
  this.upT      = 0;     // getTime() of up event (release)
  this.pressT   = 0;     // press duration (down)
  this.watch    = null;  // watch sitting on interrupt
  this.timeout  = false; // timeout to do debouncing
  this.enabled  = false; // state / keypad enabled
}, p = Kpd.prototype;

// .connect() w/ setup i2c appliance, adjusted address (<<1) and interrupt
//
// NOTE: EXPECTS BANK=0 (after reset) - to switch to BANK=1 (once only)
// - i2c
// - addr - portextender 3-bit address 0..7
// - intr - interrupt on pin
// - rst  - reset on pin (omittable w/ RC HW reset)
p.connect = function(i2c,addr,intr,rst) {
  this._rst(rst); var ioc = 128; // IOCONfig: BANK=1, SEQ,
  pinMode(intr,"input_pulldown");
  this.intr = intr;    // portexpander interrupt on pin
  this.i2c  = i2c;     // i2c appliance setp on scl and sda pins
  this.addr = 32+addr; // i2c address / adjusted and complemented
  this._w(10,ioc) // IOCON - I/O EXPANDER CONFIGURATION: BANK=1,SEQ
      ._w( 0,     // starting with reg 00 and 8-bit mode sequentially
  [ 15 // 00 IODIR - I/O DIRection: 0/1 = out/inp
  , 15 // 01 IPOL - INPUT POLARITY: 0/1 = equal/opposite
  ,  0 // 02 GPINTEN - INTERRUPT-ON-CHANGE: 0/1 = dis/en-able - FOR NOW
  ,240 // 03 DEFVAL - DEFAULT VALUE (for int trigger): don't care
  ,  0 // 04 INTCON - INTERRUPT-ON-CHANGE CONTROL: 0/1 = do not/compare
  ,ioc // 05 IOCON - I/O EXPANDER CONfig: BANK=1,... (as above)
  , 15 // 06 GPPU - GPIO PULL-UP RESISTOR 100k: 0/1 = dis/en-abled
  ]);
  return this;
};

p._rst = function(rst) { // private
  if (rst !== undefined) { pinMode(rst,"output"); rst.reset(); }
  this.rst = rst;
  if (rst !== undefined) { rst.set(); }
};

// enable/disable (w/ arg false) keypad
p.enable = function(b) {
  if ((b=((b===undefined)||b)) != this.enabled) {
    return (b) ? this._enable() : this._disable(); }
  return this;
};

// all private / for convenience; NOTE: EXPECT BANK=1
p._w = function(r,dArr) { this.i2c.writeTo(this.addr,r,dArr); return this; };
p._ro = function(amnt) { return this.i2c.readFrom(this.addr,amnt); };
p._r = function(r,amnt) { return this._w(r,[])._ro(amnt); };

// watch callback for key down  // private; NOTE: EXPECTS BANK=1
p._down = function(state, time) {
  this.watch = false;
  var dwnT = getTime()         // capture down time
    , rnb = this._r(7,1)[0];   // 07 INTF: read interrupt flags,...
  this._w(2,0);                // 02 GPINTEN: ...disable ints,...
  this.timeout = setTimeout(this._dChk.bind(this) // ...check deferred...
     ,this.debounce,dwnT,rnb); // ...down bits for row and col info
};

// key down check (after debaounce time) // private; NOTE: EXPECTS BANK=1
p._dChk = function(dwnT,rnb) {
  this.timeout=false;
  var rc=0, rb=1, r=0, cnb, cc=0, cb=239, c=0; // prep to...
  while (++rc < 5 && !r) {     // ...find 1st row bit for row info
    if (rnb&rb) r = rc; else rb <<= 1; }
  while (++cc < 5 && !c) {     // ...find 1st col bit for col info
    cnb = this._w(9,cb)._r(9,1)[0]&15; // 09 GPIO: write/read - scan col
    if (cnb&rb) c = cc; else cb <<= 1; }
  this._w(9,15);               // put 'normal' (all outs on low)
  if (r && c) { // row and col present, key still pressed
    this.dwnT=dwnT; this.down=true; this.key=(r-1)*4+(c-1); this.upT=0; 
    this.timeout=setTimeout(this._uChk.bind(this),this.upcheck,true);
    if (this.downCB) setTimeout(this.downCB, 1, this, p._kMap(this.key), this.dwnT);
  } else { // was a fluke/press within debounce
    this.timeout=setTimeout(this._uChk.bind(this),this.upcheck,false);
  }
};

// key up check (by upcheck interval) // private; NOTE: EXPECTS BANK=1
p._uChk = function(frst) {
  var upT = getTime()           // capture up time...
    , dwn = this._r(9,1)[0]&15; // 09 GPIO: or any downs
  if (frst || dwn) {
    this.timeout=setTimeout(this._uChk.bind(this),this.upcheck,!!dwn);
  } else {
    this.timeout=false; this.pressT=(this.upT=upT)-this.dwnT;
    this.watch = setWatch(this._down.bind(this),this.intr,{edge:"falling"});
    this._w(2,15); // 02 GPINTEN - enable interrupts
    if (this.down) {
      this.down=false;
      if (this.upCB) {
        setTimeout(this.upCB, 1, this, p._kMap(this.key), this.upT, this.pressT);
    } }
  }
};

p._kMap = function(key) {
	let c = '';
	switch(key) {
		case 0: c = 1; break;
		case 1: c = 2; break;
		case 2: c = 3; break;
		case 3: c = 'A'; break;
		case 4: c = 4; break;
		case 5: c = 5; break;
		case 6: c = 6; break;
		case 7: c = 'B'; break;
		case 8: c = 7; break;
		case 9: c = 8; break;
		case 10: c = 9; break;
		case 11: c = 'C'; break;
		case 12: c = '*'; break;
		case 13: c = 0; break;
		case 14: c = '#'; break;
		case 15: c = 'D'; break;
	}
	return c.toString();
};

p._enable = function() { // private; NOTE: EXPECTS BANK=1
  this._w(2, 0)  // 02 GPINTEN - disable interrupts / prec
      ._r(8, 1); // 08 INTCAP - INT CAPTURE reg to clear int
  this._w(9,15)  // 09 GPIO - G I/O reg: all outs low / prec
      ._w(2,15); // 02 GPINTEN - enable interrupts / prec
  this.watch = setWatch(this._down.bind(this),this.intr,{edge:"falling"});
  this.enabled = true; 
  return this;
};

p._disable = function() { // private; NOTE: EXPECTS BANK=1
  this.enabled = false;
  this.upT = getTime(); // take cancel/disable time
  this._w(2,0).r(8,1);  // 02 GPINTEN / 08 INTCAP - disable/clear ints
  if (this.watch) { clearWatch(this.watch); this.watch = false; }
  if (this.timeout) { clearTimeout(this.timeout); this.timeout = false; }
  if (this.down) {
    this.down = false; this.pressT = this.upT-this.dwnT;
    if (this.upCB) { // disable while pressed, ...cancelled
      setTimeout(this.upCB,1,this,this.key,this.upT,this.pressT,true); } }
  return this;
};

exports.connect = function( callback, i2c, addr, intr, rst ) {
	return new Kpd( function(){}, callback ).connect( i2c, addr, intr, rst ).enable();
};
