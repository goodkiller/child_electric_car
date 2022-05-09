

console.log('Start');

// WIFI
var _wifi_ssid = '***',
    _wifi_password = '***',
    readings = [],
    CPM = 0,
    net_disconnected_count = 0;

var wifi = require("Wifi"),
    http = require("http");

// Serial setup
Serial2.setup(9600, { rx: D25, tx: D26 });

// When a page is requested...
function pageHandler(req, res)
{
  console.log('[HTTP] GET:', req.url);

  if (req.url == '/')
  {
    res.writeHead(200);
    res.end('<html><head><title>Geiger counter</title></head><body>' + CPM + ' CPM<br />' + (CPM / 122).toFixed(4) + ' uSv/h<hr />' + printReadings() + '</body></html>');
  }
  else
  {
    res.writeHead(404);
    res.end("404: Not found");
  }
}

// Send data
function sendData(postURL, data, callback)
{
  if( isNetwork() )
  {
    let content = JSON.stringify(data);

    let options = url.parse(postURL, false);
        options.method = 'POST';
        options.headers = {
          'Content-Type': 'application/json',
          'Content-Length': content.length
        };

    let req = http.request(options, res => {
      let d = '';
      res.on('data', function(data) { d+= data; });
      res.on('close', function(data) { callback(d); });
    });

    req.on('error', e => {
      callback(e);
    });

    req.end(content);
  }
  else
  {
    console.log('[Serial] Unable to send data, WIFI not connected.');
  }
}

function printReadings()
{
  let str = '';
  
  for( let i in readings )
  {
    str += i + ' - ' + readings[i] + '<br />';
  }
  
  return str;
}

function addReadings( value )
{
  readings[Math.round(Date.now())] = value;
  
  for(let i in readings){
    if(i > 10){
      console.log('delete:', i, readings[i]);
      delete readings[i];
    }
  }
  
  sendData('http://radioaktiivsus.ee/api/cpm', { cpm: value }, d => {
    console.log('[HTTP] Response:', d);
  });
}

function readSerial()
{
  Serial2.on('data', data => {

    console.log('[Serial] Data:', data);

    CPM = parseInt(data);

    if( !isNaN(CPM) ){
      addReadings(CPM);
    }
  });
}

// Check if wifi connection exists
function isNetwork(){
  return (wifi.getStatus().station == 'connected' && wifi.getIP().ip != '0.0.0.0');
}

function wifiConnect()
{
  console.log('[WIFI] Connect to', _wifi_ssid);

  // Connect to wifi
  wifi.connect( _wifi_ssid, { password: _wifi_password }, e => {

    console.log('[WIFI] Connecting to ' + _wifi_ssid + ' ...');

    if(e){
      console.log('[WIFI] Connection Error:', e);
      return;
    }

    wifi.setHostname('GeigerCounter');
    wifi.setSNTP('1.ee.pool.ntp.org', '2');

    wifi.getIP((f, ip) => {

      console.log('[WIFI] Connected:', ip);

      wifi.save(); // Next reboot will auto-connect

      // Create server
      http.createServer(pageHandler).listen(80);
    });
  });
}

function onInit()
{
  console.log('Geiger Counter v0.2');

  readSerial();
  wifiConnect();

  // Wifi disconnected
  wifi.on('disconnected', details => {

    console.log('[WIFI] Disconnected:', details);

    wifiConnect();

    net_disconnected_count++;

    if(net_disconnected_count > 15){
      console.log("[WIFI] too much disconnected events, let's reboot!");
      E.reboot();
    }
  });
}

