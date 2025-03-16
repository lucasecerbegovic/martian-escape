// Global variables
let spaceshipX, spaceshipY, spaceshipWidth, spaceshipHeight;
let obstacles = [];
let score = 0;
let gameOver = false;
let moveLeft = false;
let moveRight = false;
let lasers = [];
let canShoot = true;
let lastShotTime = 0;
let shootingCooldown = 250; // Milliseconds between shots
let powerups = [];
let shieldActive = false;
let shieldTimer = 0;
let powerupTypes = ['shield', 'rapidFire', 'tripleShot'];
let currentPowerup = null;
let powerupDuration = 5000; // 5 seconds
let isMobile = false;
let touchStartX = 0;
let leftButton, rightButton, shootButton;
let canvasScaleFactor = 1;
let playAgainButton = {
  x: 0,
  y: 0,
  width: 0,
  height: 0
};

// Obstacle class for falling asteroids
class Obstacle {
  constructor(x, size) {
    this.x = x;
    this.y = 0; // Start at the top
    this.size = size;
    this.rotation = 0;
    this.rotSpeed = random(-0.05, 0.05); // Random rotation speed
    this.points = [];
    let pointsCount = 8;
    for (let i = 0; i < pointsCount; i++) {
      let angle = map(i, 0, pointsCount, 0, TWO_PI);
      let r = size + random(-size / 4, size / 4);
      let px = r * cos(angle);
      let py = r * sin(angle);
      this.points.push({ x: px, y: py });
    }
  }

  // Move the obstacle downward and update rotation
  update() {
    this.y += 2;
    this.rotation += this.rotSpeed;
  }

  // Draw the asteroid with irregular shape and rotation
  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    fill(128); // Gray color for asteroids
    beginShape();
    for (let p of this.points) {
      vertex(p.x, p.y);
    }
    endShape(CLOSE);
    pop();
  }
}

// Add these new classes
class Laser {
  constructor(x, y, pattern = 'single') {
    this.x = x;
    this.y = y;
    this.pattern = pattern;
    this.speed = 7;
    this.width = 3;
    this.height = 10;
  }

  update() {
    this.y -= this.speed;
  }

  draw() {
    push();
    noStroke();
    fill(255, 0, 0, 200);
    rect(this.x, this.y, this.width, this.height);
    // Laser glow effect
    fill(255, 0, 0, 100);
    rect(this.x - 2, this.y, this.width + 4, this.height);
    pop();
  }
}

class Powerup {
  constructor(x, type) {
    this.x = x;
    this.y = 0;
    this.type = type;
    this.size = 20;
    this.speed = 2;
    this.rotation = 0;
    this.pulseSize = 0;
    this.pulseDir = 0.1;
  }

  update() {
    this.y += this.speed;
    this.rotation += 0.05;
    
    // Add pulsing effect
    this.pulseSize += this.pulseDir;
    if (this.pulseSize > 1 || this.pulseSize < 0) {
      this.pulseDir *= -1;
    }
  }

  draw() {
    push();
    translate(this.x + this.size/2, this.y + this.size/2);
    rotate(this.rotation);
    
    // Outer glow
    noFill();
    strokeWeight(2);
    
    switch(this.type) {
      case 'shield':
        stroke(0, 255, 255, 150);
        ellipse(0, 0, this.size * (1.5 + this.pulseSize/2));
        fill(0, 200, 255);
        break;
      case 'rapidFire':
        stroke(255, 0, 0, 150);
        ellipse(0, 0, this.size * (1.5 + this.pulseSize/2));
        fill(255, 50, 50);
        break;
      case 'tripleShot':
        stroke(255, 255, 0, 150);
        ellipse(0, 0, this.size * (1.5 + this.pulseSize/2));
        fill(255, 255, 50);
        break;
    }
    
    // Draw powerup icon with 3D effect
    noStroke();
    
    // Base shape
    star(0, 0, this.size/4, this.size/2, 5);
    
    // Highlight
    fill(255, 255, 255, 150);
    star(0, 0, this.size/8, this.size/4, 5);
    
    // Icon in the center based on powerup type
    fill(255);
    switch(this.type) {
      case 'shield':
        ellipse(0, 0, this.size/4);
        break;
      case 'rapidFire':
        // Draw a lightning bolt
        beginShape();
        vertex(-2, -5);
        vertex(2, 0);
        vertex(-1, 0);
        vertex(3, 5);
        vertex(0, 1);
        vertex(3, 1);
        endShape(CLOSE);
        break;
      case 'tripleShot':
        // Draw three small dots
        ellipse(-3, 0, 3);
        ellipse(0, 0, 3);
        ellipse(3, 0, 3);
        break;
    }
    
    pop();
  }
}

// Add this helper function for drawing stars
function star(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle/2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a+halfAngle) * radius1;
    sy = y + sin(a+halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

// Setup function to initialize the game
function setup() {
  // Check if we're on a mobile device
  isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Create a responsive canvas
  if (isMobile) {
    // Use full width on mobile, maintain aspect ratio
    canvasScaleFactor = windowWidth / 600;
    createCanvas(windowWidth, windowWidth * (400/600));
  } else {
    createCanvas(600, 400);
  }
  
  // Initialize game variables
  spaceshipWidth = 40;
  spaceshipHeight = 50;
  spaceshipX = width / 2 - spaceshipWidth / 2;
  spaceshipY = height - spaceshipHeight - 10;
  
  // Create mobile control buttons if on mobile
  if (isMobile) {
    // Create left, right, and shoot buttons
    let buttonSize = width / 6;
    let buttonY = height - buttonSize - 10;
    
    leftButton = {
      x: 20,
      y: buttonY,
      size: buttonSize,
      isPressed: false
    };
    
    rightButton = {
      x: buttonSize + 40,
      y: buttonY,
      size: buttonSize,
      isPressed: false
    };
    
    shootButton = {
      x: width - buttonSize - 20,
      y: buttonY,
      size: buttonSize,
      isPressed: false
    };
  }
}

// Add this function to handle window resizing
function windowResized() {
  if (isMobile) {
    canvasScaleFactor = windowWidth / 600;
    resizeCanvas(windowWidth, windowWidth * (400/600));
    
    // Update button positions
    let buttonSize = width / 6;
    let buttonY = height - buttonSize - 10;
    
    leftButton.x = 20;
    leftButton.y = buttonY;
    leftButton.size = buttonSize;
    
    rightButton.x = buttonSize + 40;
    rightButton.y = buttonY;
    rightButton.size = buttonSize;
    
    shootButton.x = width - buttonSize - 20;
    shootButton.y = buttonY;
    shootButton.size = buttonSize;
  }
}

// Add these touch event handlers
function touchStarted() {
  if (!isMobile) return;
  
  if (gameOver) {
    // Check if Play Again button was touched
    if (touchX >= playAgainButton.x && touchX <= playAgainButton.x + playAgainButton.width &&
        touchY >= playAgainButton.y && touchY <= playAgainButton.y + playAgainButton.height) {
      resetGame();
      return false;
    }
  } else {
    // Existing touch controls for gameplay
    if (isPointInRect(touchX, touchY, leftButton.x, leftButton.y, leftButton.size, leftButton.size)) {
      leftButton.isPressed = true;
      moveLeft = true;
    }
    
    if (isPointInRect(touchX, touchY, rightButton.x, rightButton.y, rightButton.size, rightButton.size)) {
      rightButton.isPressed = true;
      moveRight = true;
    }
    
    if (isPointInRect(touchX, touchY, shootButton.x, shootButton.y, shootButton.size, shootButton.size)) {
      shootButton.isPressed = true;
      shoot();
    }
  }
  
  // Prevent default behavior (scrolling, zooming)
  return false;
}

function touchEnded() {
  if (!isMobile) return;
  
  // Reset button states
  if (leftButton.isPressed) {
    leftButton.isPressed = false;
    moveLeft = false;
  }
  
  if (rightButton.isPressed) {
    rightButton.isPressed = false;
    moveRight = false;
  }
  
  if (shootButton.isPressed) {
    shootButton.isPressed = false;
  }
  
  // Prevent default behavior
  return false;
}

// Helper function to check if a point is inside a rectangle
function isPointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

// Draw function to handle game loop
function draw() {
  if (!gameOver) {
    // Space background with stars
    background(10, 10, 40); // Deep space blue
    
    // Draw stars
    fill(255, 255, 255, 200);
    noStroke();
    for (let i = 0; i < 100; i++) {
      let x = (i * 17) % width;
      let y = (i * 23) % height;
      let size = noise(i * 0.1, frameCount * 0.01) * 3;
      ellipse(x, y, size);
    }
    
    // Add some distant nebula effects
    noFill();
    for (let i = 0; i < 3; i++) {
      let x = (width/3) * i + 100;
      let y = height/2 + sin(frameCount * 0.01 + i) * 100;
      let size = 150 + sin(frameCount * 0.005 + i) * 50;
      
      for (let j = 0; j < 3; j++) {
        let alpha = 50 - j * 15;
        if (i === 0) stroke(100, 50, 255, alpha); // Purple nebula
        if (i === 1) stroke(50, 200, 255, alpha); // Blue nebula
        if (i === 2) stroke(255, 100, 50, alpha); // Orange nebula
        ellipse(x, y, size + j * 20);
      }
    }
    
    // Draw the spaceship
    drawSpaceship(spaceshipX, spaceshipY, spaceshipWidth, spaceshipHeight);
    
    // Update spaceship position based on key inputs
    if (moveLeft) {
      spaceshipX -= 5; // Move left
    }
    if (moveRight) {
      spaceshipX += 5; // Move right
    }
    spaceshipX = constrain(spaceshipX, 0, width - spaceshipWidth); // Keep within canvas
    
    // Generate new asteroids every 50 frames
    if (frameCount % 50 === 0) {
      let x = random(0, width);
      let size = random(10, 30);
      obstacles.push(new Obstacle(x, size));
    }
    
    // Update and draw all asteroids
    for (let i = obstacles.length - 1; i >= 0; i--) {
      let obs = obstacles[i];
      obs.update();
      obs.draw();
      if (obs.y > height) { // If asteroid falls off screen
        obstacles.splice(i, 1); // Remove it
        score++; // Increase score
      }
    }
    
    // Check for collisions between spaceship and asteroids
    for (let obs of obstacles) {
      if (circleRect(obs.x, obs.y, obs.size, spaceshipX, spaceshipY, spaceshipWidth, spaceshipHeight)) {
        gameOver = true; // End game on collision
      }
    }
    
    // Update and draw lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
      lasers[i].update();
      lasers[i].draw();
      
      // Remove lasers that go off screen
      if (lasers[i].y < 0) {
        lasers.splice(i, 1);
        continue;
      }
      
      // Check for collision with asteroids
      for (let j = obstacles.length - 1; j >= 0; j--) {
        let obs = obstacles[j];
        let hit = circleRect(obs.x, obs.y, obs.size/2, 
                           lasers[i].x, lasers[i].y, 
                           lasers[i].width, lasers[i].height);
        if (hit) {
          // Create explosion effect
          createExplosion(obs.x, obs.y);
          obstacles.splice(j, 1);
          lasers.splice(i, 1);
          score += 5;
          break;
        }
      }
    }

    // Generate powerups
    if (frameCount % 300 === 0) { // Every 5 seconds
      let type = random(powerupTypes);
      powerups.push(new Powerup(random(width - 20), type));
    }

    // Update and draw powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      let p = powerups[i];
      p.update();
      p.draw();
      
      // Check collision with spaceship
      if (rectRect(p.x, p.y, p.size, p.size,
                  spaceshipX, spaceshipY, spaceshipWidth, spaceshipHeight)) {
        activatePowerup(p.type);
        powerups.splice(i, 1);
      }
      
      // Remove if off screen
      if (p.y > height) {
        powerups.splice(i, 1);
      }
    }

    // Draw shield if active
    if (shieldActive) {
      push();
      noFill();
      stroke(0, 255, 255, 150);
      strokeWeight(2);
      ellipse(spaceshipX + spaceshipWidth/2, spaceshipY + spaceshipHeight/2, 
              spaceshipWidth * 1.5, spaceshipHeight * 1.5);
      pop();
    }
    
    // Draw mobile controls if on mobile device
    if (isMobile) {
      drawMobileControls();
    }
    
    // Display the score
    fill(255); // White text
    textSize(16);
    textAlign(LEFT);
    text("Score: " + score, 10, 20);
  } else {
    // Game over state
    background(0); // Black background
    
    // Continue drawing stars in background for visual interest
    fill(255, 255, 255, 200);
    noStroke();
    for (let i = 0; i < 100; i++) {
      let x = (i * 17) % width;
      let y = (i * 23) % height;
      let size = noise(i * 0.1, frameCount * 0.01) * 3;
      ellipse(x, y, size);
    }
    
    // Game over text
    fill(255, 50, 50);
    textSize(40);
    textAlign(CENTER);
    text("GAME OVER", width / 2, height / 3);
    
    fill(255);
    textSize(24);
    text("Final Score: " + score, width / 2, height / 2);
    
    // Draw Play Again button
    playAgainButton.width = 200;
    playAgainButton.height = 60;
    playAgainButton.x = width/2 - playAgainButton.width/2;
    playAgainButton.y = height * 0.65;
    
    // Button glow effect
    for (let i = 3; i > 0; i--) {
      noFill();
      stroke(0, 150, 255, 50/i);
      strokeWeight(i*2);
      rect(playAgainButton.x - i*3, playAgainButton.y - i*3, 
           playAgainButton.width + i*6, playAgainButton.height + i*6, 15);
    }
    
    // Button background
    fill(0, 100, 200);
    stroke(0, 150, 255);
    strokeWeight(3);
    rect(playAgainButton.x, playAgainButton.y, 
         playAgainButton.width, playAgainButton.height, 10);
    
    // Button text
    fill(255);
    noStroke();
    textSize(24);
    text("PLAY AGAIN", width/2, playAgainButton.y + playAgainButton.height/2 + 8);
  }
}

// Function to draw the spaceship
function drawSpaceship(x, y, w, h) {
  push();
  translate(x + w/2, y + h/2);
  
  // Main body
  fill(220, 220, 240);
  stroke(40, 40, 80);
  strokeWeight(2);
  
  // Ship hull
  beginShape();
  vertex(0, -h/2 - 5);  // Nose of ship
  vertex(w/2, -h/4);    // Right top edge
  vertex(w/2 + 5, h/4); // Right wing tip
  vertex(w/3, h/2);     // Right back corner
  vertex(-w/3, h/2);    // Left back corner
  vertex(-w/2 - 5, h/4);// Left wing tip
  vertex(-w/2, -h/4);   // Left top edge
  endShape(CLOSE);
  
  // Cockpit
  fill(100, 200, 255, 200);
  stroke(180);
  ellipse(0, -h/6, w/3, h/3);
  
  // Engine glow
  if (moveLeft || moveRight) {
    // Thruster fire
    noStroke();
    
    // Outer glow
    fill(255, 100, 0, 150);
    beginShape();
    vertex(-w/4, h/2);
    vertex(w/4, h/2);
    vertex(0, h/2 + random(15, 25));
    endShape(CLOSE);
    
    // Inner glow
    fill(255, 255, 0, 200);
    beginShape();
    vertex(-w/8, h/2);
    vertex(w/8, h/2);
    vertex(0, h/2 + random(10, 20));
    endShape(CLOSE);
  }
  
  // Detail lines
  stroke(80, 80, 120);
  strokeWeight(1);
  line(-w/3, 0, w/3, 0);
  line(-w/4, h/4, w/4, h/4);
  
  // Wing details
  fill(60, 60, 180);
  noStroke();
  rect(-w/2 - 2, -h/8, 5, h/3, 2);
  rect(w/2 - 3, -h/8, 5, h/3, 2);
  
  // Weapon mounts
  fill(80);
  rect(-w/3, -h/4, 5, 10, 2);
  rect(w/3 - 5, -h/4, 5, 10, 2);
  
  pop();
}

// Function to draw static craters on the ground
function drawCraters() {
  // Craters removed as requested
}

// Function to check circle-rectangle collision
function circleRect(cx, cy, radius, rx, ry, rw, rh) {
  // Find the closest point to the circle within the rectangle
  let closestX = constrain(cx, rx, rx + rw);
  let closestY = constrain(cy, ry, ry + rh);
  // Calculate the distance between the circle's center and this closest point
  let dx = cx - closestX;
  let dy = cy - closestY;
  // If the distance is less than the radius, collision occurs
  return (dx * dx + dy * dy) < (radius * radius);
}

// Handle key presses for spaceship movement
function keyPressed() {
  if (keyCode === LEFT_ARROW) {
    moveLeft = true;
  } else if (keyCode === RIGHT_ARROW) {
    moveRight = true;
  } else if (keyCode === 32) { // Space bar
    if (gameOver) {
      resetGame();
    } else {
      shoot();
    }
  }
}

// Handle key releases to stop movement
function keyReleased() {
  if (keyCode === LEFT_ARROW) {
    moveLeft = false;
  } else if (keyCode === RIGHT_ARROW) {
    moveRight = false;
  }
}

// Add these new functions
function activatePowerup(type) {
  currentPowerup = type;
  switch(type) {
    case 'shield':
      shieldActive = true;
      setTimeout(() => { shieldActive = false; }, powerupDuration);
      break;
    case 'rapidFire':
      shootingCooldown = 100;
      setTimeout(() => { shootingCooldown = 250; }, powerupDuration);
      break;
    case 'tripleShot':
      setTimeout(() => { currentPowerup = null; }, powerupDuration);
      break;
  }
}

function shoot() {
  let now = millis();
  if (now - lastShotTime < shootingCooldown) return;
  
  if (currentPowerup === 'tripleShot') {
    lasers.push(
      new Laser(spaceshipX + spaceshipWidth/2, spaceshipY),
      new Laser(spaceshipX + spaceshipWidth/2 - 10, spaceshipY),
      new Laser(spaceshipX + spaceshipWidth/2 + 10, spaceshipY)
    );
  } else {
    lasers.push(new Laser(spaceshipX + spaceshipWidth/2, spaceshipY));
  }
  
  lastShotTime = now;
}

// Add explosion effect
function createExplosion(x, y) {
  // Add particle effect here if you want
  // For now we'll keep it simple
}

// Helper function for powerup collision
function rectRect(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 &&
         x1 + w1 > x2 &&
         y1 < y2 + h2 &&
         y1 + h1 > y2;
}

// Add this function to draw mobile controls
function drawMobileControls() {
  push();
  noStroke();
  
  // Left button
  fill(leftButton.isPressed ? 100 : 50, 50, 200, 150);
  rect(leftButton.x, leftButton.y, leftButton.size, leftButton.size, 10);
  fill(255);
  triangle(
    leftButton.x + leftButton.size * 0.7, leftButton.y + leftButton.size * 0.3,
    leftButton.x + leftButton.size * 0.7, leftButton.y + leftButton.size * 0.7,
    leftButton.x + leftButton.size * 0.3, leftButton.y + leftButton.size * 0.5
  );
  
  // Right button
  fill(rightButton.isPressed ? 100 : 50, 50, 200, 150);
  rect(rightButton.x, rightButton.y, rightButton.size, rightButton.size, 10);
  fill(255);
  triangle(
    rightButton.x + rightButton.size * 0.3, rightButton.y + leftButton.size * 0.3,
    rightButton.x + rightButton.size * 0.3, rightButton.y + leftButton.size * 0.7,
    rightButton.x + rightButton.size * 0.7, rightButton.y + leftButton.size * 0.5
  );
  
  // Shoot button
  fill(shootButton.isPressed ? 255 : 200, 50, 50, 150);
  rect(shootButton.x, shootButton.y, shootButton.size, shootButton.size, 10);
  fill(255);
  ellipse(
    shootButton.x + shootButton.size * 0.5,
    shootButton.y + shootButton.size * 0.5,
    shootButton.size * 0.6
  );
  
  pop();
}

// Modify the mousePressed function to handle button clicks
function mousePressed() {
  if (gameOver) {
    // Check if Play Again button was clicked
    if (mouseX >= playAgainButton.x && mouseX <= playAgainButton.x + playAgainButton.width &&
        mouseY >= playAgainButton.y && mouseY <= playAgainButton.y + playAgainButton.height) {
      resetGame();
    }
  }
}

// Update resetGame to also reset the spaceship position
function resetGame() {
  gameOver = false;
  score = 0;
  obstacles = [];
  lasers = [];
  powerups = [];
  shieldActive = false;
  currentPowerup = null;
  moveLeft = false;
  moveRight = false;
  
  // Reset spaceship position
  spaceshipX = width / 2 - spaceshipWidth / 2;
  spaceshipY = height - spaceshipHeight - 10;
  
  // Reset shooting cooldown
  shootingCooldown = 250;
  lastShotTime = 0;
}
