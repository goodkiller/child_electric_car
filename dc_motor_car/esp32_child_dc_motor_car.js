
var R_PWM = NodeMCU.D1,
    L_PWM = NodeMCU.D2,
    
    L_EN = NodeMCU.D3,
    R_EN = NodeMCU.D5,
    
    PDL = NodeMCU.D8, // Pedal switch
    
    FWD = NodeMCU.D6, // Forward switch
    RVS = NodeMCU.D7,
    
    currentDirection = ''; // Reverse switch

var Config = {
    debounceTime: 500,
  
    minSpeed: 0.3,
    maxSpeed: 1.0
};


function onInit()
{
  console.log('onInit');
  
  // Set inputs
  pinMode(PDL, 'input');
  pinMode(FWD, 'input');
  pinMode(RVS, 'input');

  setInterval(e => {
    checkDriveStatus();
  }, 500);
}

function checkDriveStatus()
{
  let dir = getDirection(),
      speed = getPedal();
    
  if( speed == 0 || dir == 0 ){
    return stop();
  }
  
  digitalWrite(L_EN, HIGH);
  digitalWrite(R_EN, HIGH);

  if( dir == 1 )
  {
    analogWrite(R_PWM, 1);
    analogWrite(L_PWM, 0);

    console.log( '[DRIVE] FWD Speed: ', speed, ', Dir: ', dir );

    return true;
  }
  else if( dir == 2 )
  {
    analogWrite(R_PWM, 0);
    analogWrite(L_PWM, 1);

    console.log( '[DRIVE] RVS Speed: ', speed, ', Dir: ', dir );

    return true;
  }
}

function getDirection()
{
  let FWD_Status = digitalRead(FWD),
      RVS_Status = digitalRead(RVS);
  
  if( FWD_Status ) return 1;
  if( RVS_Status ) return 2;

  return 0; 
}

function getPedal()
{
  let PDL_Status = digitalRead(PDL);
  
  return PDL_Status;
}

function stop()
{
  digitalWrite(L_EN, LOW);
  digitalWrite(R_EN, LOW);
  
  analogWrite(R_PWM, 0);
  analogWrite(L_PWM, 0);
  
  return true;
}
