
var R_PWM = NodeMCU.D1,
    L_PWM = NodeMCU.D2,
    
    L_EN = NodeMCU.D3,
    R_EN = NodeMCU.D4,
    
    PDL = NodeMCU.D8, // Pedal switch
    
    FWD = NodeMCU.D6, // Forward switch
    RVS = NodeMCU.D7,
    
    currentDirection = ''; // Reverse switch



function onInit()
{
  console.log('onInit');
  
  // Set voltage LOW
  pinMode(PDL, 'input');
  pinMode(FWD, 'input_pullup');
  pinMode(RVS, 'input_pullup');

  // PDL switch pressed
  setWatch(drive, PDL, { repeat: true, edge: 'both', debounce: 100 });
  
  // Direction changeFWD
  setWatch(e => {
    direction_change(e, 'FWD');
  }, FWD, { repeat: true, edge: 'falling', debounce: 100 });
  
  // Direction change RVS
  setWatch(e => {
    direction_change(e, 'RVS');
  }, RVS, { repeat: true, edge: 'falling', debounce: 100 });
}


function drive( e )
{
  console.log( 'Direction is: ', currentDirection );
  
  // Stop
  if( e !== undefined && !e.state ){
    stop();
  }
  
  if( currentDirection == 'FWD' )
  {
    
    
  }
  
  digitalWrite(L_EN, HIGH);
  digitalWrite(R_EN, HIGH);
  
  analogWrite(R_PWM, 0);
  analogWrite(L_PWM, 0.3);
  
  console.log('Drive...', e);
  
}

function direction_change( e, dir )
{
  console.log('Change direction to ', dir);
  
  currentDirection = dir;
  
  // Drive
  drive();
}






function stop()
{
  digitalWrite(L_EN, LOW);
  digitalWrite(R_EN, LOW);
  
  analogWrite(R_PWM, 0);
  analogWrite(L_PWM, 0);
  
  console.log('Stop');
}
