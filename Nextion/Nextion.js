/* Copyright (c) 2016 HyGy. See the file LICENSE for copying permission. */
/*
This is a basic nextion hmi lcd handling module. Tested with NX3224T028_011R  2.8”	320*240	LCD.
http://wiki.iteadstudio.com/Nextion_HMI_Solution
*/

var C = {};

function NEXTION() { }

/** 'public' constants here */
NEXTION.prototype.C = {};

/** Set the given page */
exports.setPage = function(pageNum) {
  this.serialPort.print('page ' + pageNum + '\xff\xff\xff');
};

/** Set the given page */
exports.get = function(att) {
  this.serialPort.print('get ' + att + '\xff\xff\xff');
};

exports.sendme = function() {
  this.serialPort.print('sendme\xff\xff\xff');
}

exports.refreshComponent = function(componentId) {
  this.serialPort.print('ref '+componentId+'\xff\xff\xff');
}

// cov: variable type conversion
exports.cov = function(att1, att2, length)
{
  this.serialPort.print('cov '+att1+','+att2+','+length+'\xff\xff\xff');
}

// enter touch calibration
exports.touch_j = function ()
{
  this.serialPort.print('touch_j'+'\xff\xff\xff');
}

// sets the given variable, if new Val is string then send as string if number then send as number
exports.setVal = function(varName, newVal) {
  if (typeof(newVal)=='string')
  {
    this.serialPort.print(varName+'="'+newVal+'"'+'\xff\xff\xff');
  }
  else {
    this.serialPort.print(varName+'='+newVal+'\xff\xff\xff');
  }
}


/** Put most of my comments outside the functions... */
exports.commandRecived = function() {

  var lastNextionCommand=this.lastNextionCommand;

  var me = this;
  console.log('nextionCommandRecived called');
  console.log(lastNextionCommand);
  switch (lastNextionCommand[0]) {
    case 0x1a: // variable name is invalid
      console.log('0x1a: variable name is invalid');
      break;
    case 0x1b: // variable name is invalid
      console.log('0x1b: variable operation invalid');
      break;

    case 0x65: // touch event
      console.log('touch event');
      me.emit(
        'touchevent',
        lastNextionCommand[1], // pageId
        lastNextionCommand[2], // componentId
        lastNextionCommand[3] === 0x0 ? 'release' : 'press' // touchEvent press: 0x01, release 0x00
      );
      break;
    case 0x00:
      console.log('0x00: Invalid instruction sent.');
      break;

    case 0x66: // Current page ID number returns
      me.emit(
        'getpageid',
        lastNextionCommand[1]
      );
      break;

    case 0X70: // String variable data returns
      console.log('String variable data returns');
      var stringToSend = "";
      for (var cikl = 1; cikl < lastNextionCommand.length; cikl++) {
        stringToSend += E.toString(lastNextionCommand[cikl]);
      }

      me.emit(
        'stringdatareturned',
        stringToSend
      );
      break;

      case 0X71: // Numeric data returns
        console.log('Numeric variable data returns');
        var numToSend = lastNextionCommand[1]+ (lastNextionCommand[2] << 8) + (lastNextionCommand[3] << 16) + (lastNextionCommand << 24);

        me.emit(
          'numericdatareturned',
          numToSend
        );
        break;

    default:
      console.log('unknown command started with: 0x' + lastNextionCommand[0].toString(16));
  }

};

var dataArrived = function(_data) {
  var c;

  for (var cikl = 0; cikl < _data.length; cikl++) {
    c = _data[cikl];

    if (c == "\xff") {
      this.instructionEndCount++;
    } else {
      this.nextionCommandCollector.push(c);
    }

    if (this.instructionEndCount == 3) {
      this.instructionEndCount = 0;
      this.lastNextionCommand = E.toUint8Array(this.nextionCommandCollector);
      this.nextionCommandCollector = [];
      this.commandRecived();
    }
  }
};

exports.connect = function(_port) {

  var me=this;

  this.serialPort = _port;
  this.instructionEndCount=0;
  this.nextionCommandCollector=[];
  this.lastNextionCommand=[];


  Serial2.on('data', dataArrived.bind(me));

  return new NEXTION();
}
