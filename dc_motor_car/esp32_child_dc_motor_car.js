
var R_PWM = NodeMCU.D1,
    L_PWM = NodeMCU.D2,

    L_EN = NodeMCU.D3,
    R_EN = NodeMCU.D5,

    PDL = NodeMCU.D8, // Pedal switch

    FWD = NodeMCU.D6, // Forward switch
    RVS = NodeMCU.D7; // Reverse switch

var Config = {
    debounceTime: 500,

    staticSpeed: true,
    speedDelay: 5000,
    speedInterval: 150,

    minSpeed: 0.2,
    maxSpeed: 1.0
};

var Tmp = {
    currentSpeed: 0,
    speedTimer: null
};


function onInit()
{
  console.log('onInit');

  // Set inputs
  pinMode(PDL, 'input_pullup');
  pinMode(FWD, 'input_pullup');
  pinMode(RVS, 'input_pullup');

  setInterval(e => {
   checkDriveStatus();
  }, 250);
}

function checkDriveStatus()
{
  let dir = getDirection(),
      speed = getPedal();

  console.log( '[Status] Speed: ', speed, ', Dir: ', dir );

  if( speed == 0 || dir == 0 ){
    return stop();
  }

  digitalWrite(L_EN, HIGH);
  digitalWrite(R_EN, HIGH);

  if( dir == 1 )
  {
    analogWrite(R_PWM, speed);
    analogWrite(L_PWM, 0);

    // console.log( '[DRIVE] FWD Speed: ', speed, ', Dir: ', dir );

    return true;
  }
  else if( dir == 2 )
  {
    analogWrite(R_PWM, 0);
    analogWrite(L_PWM, speed);

    // console.log( '[DRIVE] RVS Speed: ', speed, ', Dir: ', dir );

    return true;
  }
}

function getDirection()
{
  let FWD_Status = digitalRead(FWD),
      RVS_Status = digitalRead(RVS);

  if( !FWD_Status ) return 1;
  if( !RVS_Status ) return 2;

  return 0; 
}

function getPedal()
{
  let PDL_Status = 0;

  // Static speed, switch
  if( Config.staticSpeed )
  {
    PDL_Status = digitalRead(PDL);

    let isMaxSpeed = Tmp.currentSpeed >= Config.maxSpeed;

    // Switch is off or we received maximum speed, let's clear interval
    if( (!PDL_Status || isMaxSpeed) && Tmp.speedTimer != null )
    {
      // Stop interval
      clearInterval(Tmp.speedTimer);

      // Reset timer
      Tmp.speedTimer = null;

      // console.log('[getPedal] Stop interval');
    }

    // Switch is on and speed is not increasing
    if( PDL_Status && !isMaxSpeed && Tmp.speedTimer == null )
    {
      Tmp.currentSpeed = Config.minSpeed;
      
      // Set speed increasing interval
      Tmp.speedTimer = setInterval(e => {

        // Increase speed
        Tmp.currentSpeed += ( Config.maxSpeed - Config.minSpeed ) / Config.speedDelay * Config.speedInterval;

        // console.log('[getPedal] Increase speed: ', Tmp.currentSpeed);

      }, Config.speedInterval);
    }

    // Switch is off, reset speed
    if( !PDL_Status ){
      Tmp.currentSpeed = 0;
    }

    return Math.min(Tmp.currentSpeed, 1.0);
  }

  // Dynamic speed (potentiometer)
  else
  {
    PDL_Status = analogRead(PDL);

    return PDL_Status;
  }
}


function stop()
{
  digitalWrite(L_EN, LOW);
  digitalWrite(R_EN, LOW);

  analogWrite(R_PWM, 0);
  analogWrite(L_PWM, 0);

  return true;
}
