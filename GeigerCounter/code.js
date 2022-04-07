


// WIFI
var _wifi_ssid = '***',
    _wifi_password = '***';

var wifi = require("Wifi"),
    http = require("http"),
    s = new Serial();

var CPM = 0;

s.setup(9600, {
  rx: NodeMCU.D1,
  tx: NodeMCU.D2
});

// When a page is requested...
function pageHandler(req, res)
{
  // otherwise write the page out
  console.log("GET "+req.url);

  if (req.url=="/")
  {
    res.writeHead(200);
    res.end('<html><head><title>Geiger counter</title></head><body>' + CPM + ' CPM<br />' + (CPM / 122).toFixed(4) + ' uSv/h</body></html>');
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
  let content = JSON.stringify(data);

  let options = url.parse(postURL, false);
      options.method = "POST";
      options.headers = {
        "Content-Type": "application/json",
        "Content-Length": content.length
      };

  let req = http.request(options, function(res){
    let d = "";
    res.on('data', function(data) { d+= data; });
    res.on('close', function(data) { callback(d); });
  });

  req.on('error', function(e){
    callback(e);
  });

  req.end(content);
}

function onInit()
{
  wifi.setHostname('GeigerCounter');
  wifi.connect( _wifi_ssid, { password: _wifi_password }, () => {
    console.log('Connected to Wifi. IP address is:', wifi.getIP().ip);
  });

  // Wifi connected
  wifi.on('connected', (details) => {
    console.log('[WiFi]: Connected - YESS.', details);
    http.createServer(pageHandler).listen(80);
  });

  // Wifi disconnected
  wifi.on('disconnected', (details) => {
    console.log('[WiFi]: Disconnected - NOO.', details);
  });

  s.on('data', function (data) {

    let value = parseInt(data);

    if( !isNaN(value) )
    {
      CPM = value;

      print('CPM: ' + CPM);

      sendData('http://radioaktiivsus.ee/api/cpm', { cpm: CPM }, function(d) {
        console.log("HTTP Response: " + d);
      });
    }
  });
}
