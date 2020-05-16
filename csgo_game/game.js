

//var wifi = require("Wifi");
//var WebServer = require("WebServer");


var ADAPTERS = {
  
  keypad: {
    i2c: null,
    pins: {
      sda: D22,
      scl: D21
    },
    addr: 0,
    intrA: D16,
    reset: D17,
    
    inputEndChar: '#',
    inputCode: '',
    
    maxCode: 8
  },
  
  nfc: {
    i2c: null,
    pins: {
      sda: D22,
      scl: D21
    }
  },
  
  display: {
    cursor: false
  },
  
  mp3play: {
    pins: {
      tx: D27,
      rx: D25
    }
  }
};

var  KPD = require('MCP32017I2CA4x4KPD9');
var MP3PLAY = require('MP3PLAY').connect(ADAPTERS.mp3play.pins);

var PN532 = require('PN532'),
    LCD = require('HD44780').connect(D5, D23, D19, D18, D26, D13);

/*
// NCF reader setup
ADAPTERS.nfc.i2c = new I2C();
ADAPTERS.nfc.i2c.setup( ADAPTERS.nfc.pins );

// NFC card mappings
var nfcTagMappings = [];
nfcTagMappings[41015982891220] = 'fnActivateBomb';
nfcTagMappings[41066382891220] = 'fnStartDefuse';
*/







var _STATUSES = {
  state: null,
  gameType: null,

  timer: 5000,
  code: ''
};

// INIT
function onInit(){

 console.log('helloo');

  _loadKeyPad();
   setDisplay();
  
  // _readNfcTags();
}

function now(){
  return Math.round(Date.now());
}

// set Display
function setDisplay()
{
  displayChar( false );
  
  // Main menu
  if( _STATUSES.state == null )
  {
    // Set menu state
    _STATUSES.state = 'menu';

    LCD.clear();
    LCD.setCursor(3, 0);
    LCD.print("( CS:GO BOMB )");
    LCD.setCursor(0, 1);
    LCD.print("Choose Gametype:");
    LCD.setCursor(0, 2);
    LCD.print("[A] Code");
    LCD.setCursor(0, 3);
    LCD.print("[B] Tag");
  }
  
  // Enter code
  else if( _STATUSES.state == 'menu' && _STATUSES.gameType == 'code' )
  {
    _STATUSES.state = 'submenu';
    
    LCD.clear();
    LCD.setCursor(3, 0);
    LCD.print("( CS:GO BOMB )");
    LCD.setCursor(0, 1);
    LCD.print("Enter defuse code:");
    LCD.setCursor(0, 3);
    LCD.print("[*] Cancel [#] Enter");
  }
  
  // Active (play)
  else if( _STATUSES.state == 'active' && _STATUSES.gameType == 'code' )
  {
    LCD.clear();
    LCD.setCursor(0, 0);
    LCD.print("CS:GO BOMB >>> ");
    
    LCD.setCursor(15, 0);
    LCD.print("05:59");
    
    LCD.setCursor(0, 1);
    LCD.print("Enter code:");
    LCD.setCursor(11, 3);
    LCD.print("[#] Enter");
  }
}

// Display char on display
function displayChar( char )
{
  // Cursor not exists and char does
  if( !ADAPTERS.display.cursor && char ){
    ADAPTERS.display.cursor = [0, 2];
  }
    
  // Cursor exists and char too
  if( ADAPTERS.display.cursor && char )
  {
    LCD.setCursor( ADAPTERS.display.cursor[0], ADAPTERS.display.cursor[1] );
    LCD.print( char );
    
    ADAPTERS.display.cursor[0]++;
  }
  
  // Cursor exists and char does not
  if( ADAPTERS.display.cursor && !char ){
    ADAPTERS.display.cursor = false;
  }
}

// Load KeyPad
function _loadKeyPad()
{
  // NCF reader setup
  ADAPTERS.keypad.i2c = new I2C();
  ADAPTERS.keypad.i2c.setup( ADAPTERS.keypad.pins );

  KPD.connect((kpd, key, time) => {
    
    console.log('KPD: ', key );
    
    MP3PLAY.play(1);
    
    if( ['A', 'B', 'C', 'D', '*', '#'].indexOf(key) >= 0 )
    {
      onKeyPadRead( (key == ADAPTERS.keypad.inputEndChar) ? ADAPTERS.keypad.inputCode : key );
      
      // No cursor needed
      if( !ADAPTERS.display.cursor ){
        ADAPTERS.keypad.inputCode = '';
      }
    }
    else
    {
      // Append key to inputCode
      ADAPTERS.keypad.inputCode = ADAPTERS.keypad.inputCode + key;
      
      displayChar( key );
    }

  }, ADAPTERS.keypad.i2c, ADAPTERS.keypad.addr, ADAPTERS.keypad.intrA, ADAPTERS.keypad.reset);
}

// Do actions on key readings
function onKeyPadRead( code )
{
  console.log('onKeyPadRead: ', code );
  
  // Main menu
  if( _STATUSES.state == 'menu' )
  {
    _STATUSES.gameType = (code == 'A') ? 'code' : 'tag';
    
    setDisplay();
  }
  
  // Submenu of code gametype
  else if( _STATUSES.state == 'submenu' && _STATUSES.gameType == 'code' )
  {
    // Cancel
    if( code == '*' )
    {
      _STATUSES.state = null;
      _STATUSES.gameType = null;
    }
    
    // Confirm code and activate game
    else
    {
      _STATUSES.state = 'active';
      _STATUSES.code = code;
    }
    
    setDisplay();
  }
}

// Read NFC tags
function _readNfcTags()
{
  let readingFrequence = 500,
      nfc = PN532.connect( ADAPTERS.nfc.i2c );

  //console.log( nfc.getVersion() );

  nfc.SAMConfig();

  setInterval(() => {
    _findNfcTags( nfc );
    _checkTagAvailability();
  }, readingFrequence);
}

function _findNfcTags( nfc ){
  nfc.findCards(card => {

    let txtCard = card.join("");

    console.log('NFC: Read: ', txtCard, ' = ', nfcTagMappings[txtCard] );

    if( nfcTagMappings[txtCard] !== undefined ){
      gameStatuses.lastTagTime = now();
    }
    
    // Card found
    if( nfcTagMappings[txtCard] == 'fnActivateBomb' ){
      //fnActivateBomb();
    }
    else if( nfcTagMappings[txtCard] == 'fnStartDefuse' ){
     // fnStartDefuse();
    }


  });
}

onInit();




