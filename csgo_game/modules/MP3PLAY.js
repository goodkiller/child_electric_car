
/*

http://www.icstation.com/mini-player-module-audio-voice-board-8bit-uart-contorl-support-card-card-p-13279.html
https://github.com/SnijderC/dyplayer/blob/master/src/dyplayer/DYPlayer.cpp

*/

function MP3PLAY( serialConn ){

	Serial2.setup( 9600, serialConn );
	
	console.log('MP3PLAY connect');

	this.scan();
}

// Query Number of songs
MP3PLAY.prototype.scan = function(){
	this._sendCommand([0xAA, 0x0C, 0x00]); // , 0xB6
};

// Play
MP3PLAY.prototype.play = function( number )
{
	let cmd = [0xAA, 0x02, 0x00]; // , 0xAC
	
	// Sond nr exists
	if( number !== undefined )
	{
		cmd = [0xAA, 0x07, 0x02, 0x00, 0x00]; // , 0xBB
		
		cmd[3] = number >> 8;
		cmd[4] = number & 0xFF;
	}
	
	this._sendCommand( cmd );
};

// Stop
MP3PLAY.prototype.stop = function(){
	this._sendCommand([0xAA, 0x04, 0x00]); // , 0xAE
};

// Next
MP3PLAY.prototype.next = function(){
	this._sendCommand([0xAA, 0x06, 0x00]); // , 0xB0
};

// Previous
MP3PLAY.prototype.prev = function(){
	this._sendCommand([0xAA, 0x05, 0x00]); // , 0xAF
};

// Set volume
MP3PLAY.prototype.setVol = function( volume )
{
	let cmd = [0xAA, 0x13, 0x01, 0x00]; // , 0xB0
	
	cmd[3] = volume;
	
	this._sendCommand( cmd );
};

// Send command
MP3PLAY.prototype._sendCommand = function( cmd, raw )
{
	if( raw == undefined ){
		raw = false;
	}
	
	// Add checksum to end
	if(!raw)
	cmd.push( this.crc(cmd) );
	
	console.log( 'CMD: ', cmd );
	
	Serial2.write( cmd );
};

MP3PLAY.prototype.crc = function( cmd ){ 
	let crc = 0;
	for( let i in cmd ) crc += cmd[i];
	return +crc;
};

exports.connect = function( serialConn ){
	return new MP3PLAY( serialConn );
};
