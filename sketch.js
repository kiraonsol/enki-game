// Global variables
let player;
let enemies = [];
let bullets = [];
let explosions = [];
let upgrades = [];
let gameState = "start";
let stage = 1;
let levelTransition = false; // Flag to prevent multiple stage increments
let stars = [];
let shootOsc, explodeOsc, hitOsc;
let enkiiLogo;
let playerSprite;
let enkiTitle;
let laserBeam;
let teslaBoss;
let starlinkMinion;
let bossBeam;
let minionBeam;
let bigEnemyFrames = [];
let midEnemyFrames = [];
let smallEnemyFrames = [];
let microEnemyFrames = [];
let redBigFrame, greenBigFrame;
let redMidFrame, greenMidFrame;
let redSmallFrame, greenSmallFrame;
let redMicroFrame, greenMicroFrame;
let heartSpinSheet;
let firepowerSheet;
let leaderboard = []; // Will be populated from Firebase
let playerName = "";
let boss = null;
let minions = []; // Ensure minions is always an array
let gameWidth = 400;
let gameHeight = 600;
let scalingFactor;
let shootTimer = 0;

// Use the globally exposed Firebase database from index.html
let database = window.database;

function preload() {
  enkiiLogo = loadImage('enkii-logo.png');
  playerSprite = loadImage('Enki-ship_46px.png');
  enkiTitle = loadImage('Enki_title.png');
  laserBeam = loadImage('laser_beam.png');
  teslaBoss = loadImage('Tesla.png');
  starlinkMinion = loadImage('Starlink.png');
  bossBeam = loadImage('boss_beam.png');
  minionBeam = loadImage('minion_beam.png');
  bigEnemyFrames = [
    loadImage('Big_Enemy01.png'),
    loadImage('Big_Enemy02.png'),
    loadImage('Big_Enemy03.png')
  ];
  midEnemyFrames = [
    loadImage('Mid_Enemy01.png'),
    loadImage('Mid_Enemy02.png'),
    loadImage('Mid_Enemy03.png')
  ];
  smallEnemyFrames = [
    loadImage('Small_Enemy01.png'),
    loadImage('Small_Enemy02.png'),
    loadImage('Small_Enemy03.png')
  ];
  microEnemyFrames = [
    loadImage('Micro_Enemy01.png'),
    loadImage('Micro_Enemy02.png'),
    loadImage('Micro_Enemy03.png')
  ];
  heartSpinSheet = loadImage('Heart_Spin.png');
  firepowerSheet = loadImage('Firepower.png');

  shootOsc = new p5.Oscillator('sine');
  shootOsc.amp(0);
  shootOsc.freq(440);

  explodeOsc = new p5.Oscillator('square');
  explodeOsc.amp(0);
  explodeOsc.freq(220);

  hitOsc = new p5.Oscillator('triangle');
  hitOsc.amp(0);
  hitOsc.freq(110);
}

function setup() {
  let aspectRatio = gameWidth / gameHeight;
  if (windowWidth / windowHeight > aspectRatio) {
    scalingFactor = windowHeight / gameHeight;
  } else {
    scalingFactor = windowWidth / gameWidth;
  }
  createCanvas(gameWidth * scalingFactor, gameHeight * scalingFactor);

  shootOsc.start();
  explodeOsc.start();
  hitOsc.start();
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: random(gameWidth),
      y: random(gameHeight),
      speed: random(1, 5)
    });
  }
  // Load leaderboard if Firebase is ready
  if (window.firebaseReady && window.database) {
    loadLeaderboard();
  } else {
    console.error('Firebase not initialized, leaderboard will not load from server');
    leaderboard = []; // Empty leaderboard if Firebase fails
  }
  selectEnemyFrames();
}

function draw() {
  background(0);
  scale(scalingFactor);

  // Update and draw stars (moving downward) - behind everything else
  for (let i = stars.length - 1; i >= 0; i--) {
    let star = stars[i];
    star.y += star.speed;
    if (star.y > gameHeight) {
      star.y = random(-10, 0);
      star.x = random(gameWidth);
      star.speed = random(1, 5);
    }
    stroke(255);
    point(star.x, star.y);
  }
  noStroke();

  if (gameState === "start") {
    image(enkiTitle, 0, 0, gameWidth, gameHeight);
    let logoWidth = 220;
    let logoAspectRatio = enkiiLogo.width / enkiiLogo.height;
    let logoHeight = logoWidth / logoAspectRatio;
    image(enkiiLogo, gameWidth / 2 - logoWidth / 2, 30, logoWidth, logoHeight);
    if (frameCount % 60 < 30) {
      fill(255);
      textSize(16 / scalingFactor);
      textAlign(CENTER);
      text("Tap to start", gameWidth / 2, gameHeight - 50);
    }
  } else if (gameState === "playing") {
    // Handle desktop keyboard controls
    if (!touches.length > 0) { // Only process keyboard if no touch input
      if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { // A key
        player.moveLeft();
      }
      if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { // D key
        player.moveRight();
      }
      if (keyIsDown(UP_ARROW) || keyIsDown(87)) { // W key
        player.moveUp();
      }
      if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) { // S key
        player.moveDown();
      }
    }

    // Handle mobile touch controls with offset
    if (touches.length > 0) {
      let touchX = touches[0].x / scalingFactor; // Raw touch X position (logical coordinates)
      let touchY = touches[0].y / scalingFactor; // Raw touch Y position (logical coordinates)

      // Offset the player position 50 pixels up from the touch point (no horizontal offset)
      const offsetX = 0; // No left/right offset
      const offsetY = -50; // Move 50 pixels up (adjust as needed to be in front of thumb)

      // Set player position with offset, constrained to game bounds
      player.x = constrain(touchX + offsetX, 10, gameWidth - 10);
      player.y = constrain(touchY + offsetY, gameHeight / 2, gameHeight - 20);

      // Continuous firing while touching
      if (shootTimer <= 0) {
        let playerBullets = bullets.filter(b => b.dir === -1 && b.isPlayer).length;
        if (playerBullets < player.numShips * 2) {
          player.shoot();
          shootTimer = 10; // Fire every 10 frames (≈0.17s at 60 FPS)
        }
      }
    }
    if (shootTimer > 0) shootTimer--;

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].update();
      if (bullets[i].offscreen()) {
        bullets.splice(i, 1);
      }
    }

    // Update boss and minions (if in boss level)
    if (stage % 5 === 0) { // Boss level
      if (boss) {
        boss.update();
        boss.shoot();
      }
      // Defensive check to ensure minions is defined
      if (Array.isArray(minions)) {
        for (let i = minions.length - 1; i >= 0; i--) {
          minions[i].update();
          let shootChance = 0.004; // Increased from 0.002 (twice as often)
          if (random() < shootChance) {
            bullets.push(new Bullet(minions[i].x, minions[i].y + 10, 1, false));
          }
        }
      } else {
        console.error('minions is not an array:', minions);
        minions = []; // Reset to empty array to prevent further errors
      }
    } else { // Regular level
      // Defensive check to ensure enemies is defined
      if (Array.isArray(enemies)) {
        for (let enemy of enemies) {
          enemy.update();
          let shootChance = 0.005 + (stage - 1) * 0.002; // Linear increase
          if (random() < shootChance) {
            bullets.push(new Bullet(enemy.x, enemy.y + 10, 1, false));
          }
        }
      } else {
        console.error('enemies is not an array:', enemies);
        enemies = []; // Reset to empty array to prevent further errors
      }
    }

    // Update upgrades
    for (let i = upgrades.length - 1; i >= 0; i--) {
      let upgrade = upgrades[i];
      upgrade.update();
      if (upgrade.offscreen() || upgrade.lifetime <= 0) {
        upgrades.splice(i, 1);
      }
    }

    // Check collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
      let bullet = bullets[i];
      if (bullet.dir === -1) { // Player's bullet (laser)
        if (stage % 5 === 0) { // Boss level
          if (boss && dist(bullet.x, bullet.y, boss.x, boss.y) < 30) { // Larger hitbox for boss
            boss.health--;
            bullets.splice(i, 1);
            if (boss.health <= 0) {
              let bossX = boss.x; // Store boss position before nullifying
              let bossY = boss.y; // Store boss position before nullifying
              explosions.push(new Explosion(bossX, bossY));
              boss = null; // Boss defeated
              minions = []; // Clear minions (ensure minions is defined as array)
              playExplosionSound();
              if (random() < 0.5) {
                upgrades.push(new Upgrade(bossX, bossY, floor(random(2))));
              }
            }
          }
          // Defensive check for minions
          if (Array.isArray(minions)) {
            for (let j = minions.length - 1; j >= 0; j--) {
              let minion = minions[j];
              if (dist(bullet.x, bullet.y, minion.x, minion.y) < 30) { // Larger hitbox for minions (match Starlink size)
                minion.health--; // Decrease minion health
                if (minion.health <= 0) {
                  explosions.push(new Explosion(minion.x, minion.y));
                  minions.splice(j, 1);
                }
                bullets.splice(i, 1);
                player.score += 50 * (1 + (stage - 1) * 0.1); // Lower score for minions
                console.log('Minion killed, new score:', player.score);
                playExplosionSound();
                if (random() < 0.1) {
                  upgrades.push(new Upgrade(minion.x, minion.y, floor(random(2))));
                }
                break;
              }
            }
          } else {
            console.error('minions is not an array during collision check:', minions);
            minions = [];
          }
        } else { // Regular level
          // Defensive check for enemies
          if (Array.isArray(enemies)) {
            for (let j = enemies.length - 1; j >= 0; j--) {
              let enemy = enemies[j];
              if (dist(bullet.x, bullet.y, enemy.x, enemy.y) < 25) { // Adjusted hitbox for larger enemy sprites
                enemy.health--; // Decrease enemy health
                if (enemy.health <= 0) {
                  explosions.push(new Explosion(enemy.x, enemy.y));
                  if (enemy.type === 1 && enemy.captured) {
                    player.numShips = 2; // Dual fighter on boss defeat
                  }
                  enemies.splice(j, 1);
                }
                player.score += 100 * (1 + (stage - 1) * 0.1); // Score scales with stage
                console.log('Enemy killed, new score:', player.score);
                playExplosionSound();
                if (random() < 0.05) {
                  upgrades.push(new Upgrade(enemy.x, enemy.y, floor(random(2))));
                }
                bullets.splice(i, 1);
                break;
              }
            }
          } else {
            console.error('enemies is not an array during collision check:', enemies);
            enemies = [];
          }
        }
      } else { // Enemy's, boss's, or minion's bullet
        let targetX = player.x; // Default to player position
        let targetY = player.y; // Default to player position
        let hitRadius = player.numShips === 1 ? 10 : 25; // Player hitbox based on ship count

        if (stage % 5 === 0 && boss) {
          // During boss level, check if the bullet should hit the player or boss
          if (bullet.isPlayer === false) { // Enemy/minion/boss bullet
            // Damage the player
            if (bullet.isBoss) { // Larger hitbox for boss projectiles (20x60)
              if (dist(bullet.x, bullet.y, targetX, targetY) < 30) { // Increased hitRadius for boss beams (match visual size)
                player.lives--;
                if (player.numShips === 2) {
                  player.numShips = 1; // Lose dual status
                }
                bullets.splice(i, 1);
                playHitSound();
                if (player.lives <= 0) {
                  gameState = "gameover"; // Show "GAME OVER" first
                  setTimeout(() => {
                    window.showNameInput(player.score); // Use HTML overlay for name input
                  }, 2000); // Transition to name input after 2 seconds
                } else {
                  // Respawn player
                  player.x = gameWidth / 2;
                  player.y = gameHeight - 20;
                }
                break;
              }
            } else { // Minion or regular enemy bullet (10x30)
              if (dist(bullet.x, bullet.y, targetX, targetY) < hitRadius) {
                player.lives--;
                if (player.numShips === 2) {
                  player.numShips = 1; // Lose dual status
                }
                bullets.splice(i, 1);
                playHitSound();
                if (player.lives <= 0) {
                  gameState = "gameover"; // Show "GAME OVER" first
                  setTimeout(() => {
                    window.showNameInput(player.score); // Use HTML overlay for name input
                  }, 2000); // Transition to name input after 2 seconds
                } else {
                  // Respawn player
                  player.x = gameWidth / 2;
                  player.y = gameHeight - 20;
                }
                break;
              }
            }
          }
        } else {
          // In non-boss levels, enemy bullets damage the player
          if (dist(bullet.x, bullet.y, targetX, targetY) < hitRadius) {
            player.lives--;
            if (player.numShips === 2) {
              player.numShips = 1; // Lose dual status
            }
            bullets.splice(i, 1);
            playHitSound();
            if (player.lives <= 0) {
              gameState = "gameover"; // Show "GAME OVER" first
              setTimeout(() => {
                window.showNameInput(player.score); // Use HTML overlay for name input
              }, 2000); // Transition to name input after 2 seconds
            } else {
              // Respawn player
              player.x = gameWidth / 2;
              player.y = gameHeight - 20;
            }
            break;
          }
        }
      }
    }

    // Check for upgrade collection
    for (let i = upgrades.length - 1; i >= 0; i--) {
      let upgrade = upgrades[i];
      if (dist(player.x, player.y, upgrade.x, upgrade.y) < 30) {
        upgrade.apply(player);
        upgrades.splice(i, 1);
        playPowerUpSound();
      }
    }

    // Draw game elements
    player.draw();
    if (stage % 5 === 0) { // Boss level
      if (boss) {
        boss.draw();
      }
      if (Array.isArray(minions)) {
        for (let minion of minions) {
          minion.draw();
        }
      }
    } else {
      if (Array.isArray(enemies)) {
        for (let enemy of enemies) {
          enemy.draw();
        }
      }
    }
    for (let bullet of bullets) {
      bullet.draw();
    }
    for (let upgrade of upgrades) {
      upgrade.draw();
    }
    for (let i = explosions.length - 1; i >= 0; i--) {
      explosions[i].update();
      explosions[i].draw();
      if (explosions[i].done) {
        explosions.splice(i, 1);
      }
    }

    // Draw UI
    fill(255);
    textSize(16 / scalingFactor);
    textAlign(LEFT);
    text("Score: " + player.score, 10, 20);
    text("Lives: " + player.lives, 10, 40);
    text("Stage: " + stage, 10, 60);
    if (stage % 5 === 0 && boss) {
      text("Boss Health: " + boss.health, 10, 80);
    }

    // Consolidated level progression logic with transition flag
    if (!levelTransition) {
      if (stage % 5 === 0) { // Boss level
        // Defensive check for minions
        if (!boss && (Array.isArray(minions) ? minions.length === 0 : true)) {
          levelTransition = true; // Set flag to prevent multiple increments
          stage++; // Increment stage once
          console.log('Boss level completed, advancing to Stage:', stage);
          createEnemies(stage);
          selectEnemyFrames();
          levelTransition = false; // Reset flag after transition
        }
      } else if (Array.isArray(enemies) ? enemies.length === 0 : true) { // Regular level
        levelTransition = true; // Set flag to prevent multiple increments
        stage++; // Increment stage once
        console.log('Regular level completed, advancing to Stage:', stage);
        if (stage % 5 === 0) {
          spawnBossAndMinions();
        } else {
          createEnemies(stage);
          selectEnemyFrames();
        }
        levelTransition = false; // Reset flag after transition
      }
    }
  } else if (gameState === "gameover") {
    fill(255);
    textSize(32 / scalingFactor);
    textAlign(CENTER);
    text("Game Over", gameWidth / 2, gameHeight / 2 - 150);
    textSize(16 / scalingFactor);
    text("Your Score: " + player.score, gameWidth / 2, gameHeight / 2 - 100);
    text("Leaderboard:", gameWidth / 2, gameHeight / 2 - 50);
    for (let i = 0; i < Math.min(5, leaderboard.length); i++) {
      text(`${i + 1}. ${leaderboard[i].name}: ${leaderboard[i].score}`, gameWidth / 2, gameHeight / 2 + i * 20);
    }
    text("Tap to restart", gameWidth / 2, gameHeight / 2 + 120);
  }
}

function touchStarted() {
  if ((gameState === "start" || gameState === "gameover") && !window.nameInputVisible) {
    startGame();
  }
  return false;
}

function keyPressed() {
  if (!touches.length > 0) { // Only process keyboard if no touch input
    if (gameState === "start" && key !== " ") {
      startGame();
    } else if (gameState === "playing" && key === " ") {
      let playerBullets = bullets.filter(b => b.dir === -1 && b.isPlayer).length;
      if (playerBullets < player.numShips * 2) {
        player.shoot();
      }
    } else if (gameState === "gameover") {
      startGame();
    }
  }
  // Prevent key presses from restarting the game when name input is visible
  if (window.nameInputVisible && (gameState === "start" || gameState === "gameover")) {
    return false;
  }
}

function startGame() {
  player = new Player();
  enemies = []; // Ensure enemies is always an array
  bullets = [];
  explosions = [];
  upgrades = [];
  stage = 1;
  levelTransition = false; // Reset flag on game start
  playerName = "";
  boss = null;
  minions = []; // Ensure minions is always an array
  gameState = "playing";
  createEnemies(stage);
  selectEnemyFrames();
}

function createEnemies(stage) {
  enemies = []; // Ensure enemies is initialized as an array
  if (stage % 5 !== 0) {
    let rows = 3 + Math.floor(stage / 5);
    let cols = 5 + Math.floor(stage / 10);
    cols = min(cols, 7);
    rows = min(rows, 5);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        let type = j === 0 ? 1 : 0;
        let x = 25 + i * (gameWidth - 50) / (cols - 1);
        let y = 50 + j * 60;
        let enemyClass;
        if (j === 0) enemyClass = 'Big';
        else if (j === 1) enemyClass = 'Mid';
        else if (j === 2) enemyClass = 'Small';
        else enemyClass = 'Micro';
        let enemy = new Enemy(x, y, type, enemyClass);
        enemy.speed = 1 + (stage - 1) * 0.1;
        enemy.health = 1;
        enemies.push(enemy);
      }
    }
  }
}

function spawnBossAndMinions() {
  boss = new Boss(gameWidth / 2, 50);
  minions = [ // Ensure minions is initialized as an array
    new Enemy(gameWidth / 2 - 100, 100, 0, 'Starlink'),
    new Enemy(gameWidth / 2 + 100, 100, 0, 'Starlink')
  ];
  for (let minion of minions) {
    minion.speed = 2.0;
    minion.health = 3;
  }
}

function selectEnemyFrames() {
  redBigFrame = floor(random(3));
  greenBigFrame = floor(random(3));
  redMidFrame = floor(random(3));
  greenMidFrame = floor(random(3));
  redSmallFrame = floor(random(3));
  greenSmallFrame = floor(random(3));
  redMicroFrame = floor(random(3));
  greenMicroFrame = floor(random(3));
}

class Player {
  constructor() {
    this.x = gameWidth / 2;
    this.y = gameHeight - 20;
    this.speed = 5;
    this.lives = 3;
    this.score = 0; // Ensure it's a number, not capped
    this.numShips = 1;
    this.tripleShot = false;
    this.tripleShotTimer = 0;
  }

  draw() {
    let frame = this.numShips === 1 ? floor(frameCount / 10) % 3 : (frameCount % 60 < 30 ? 1 : 2);
    image(playerSprite, this.x - 24, this.y - 24, 48, 48, frame * 48, 0, 48, 48);
    if (this.tripleShot) {
      this.tripleShotTimer--;
      if (this.tripleShotTimer <= 0) this.tripleShot = false;
    }
  }

  moveLeft() {
    this.x -= this.speed;
    if (this.x < 10) this.x = 10;
  }

  moveRight() {
    this.x += this.speed;
    if (this.x > gameWidth - 10) this.x = gameWidth - 10;
  }

  moveUp() {
    this.y -= this.speed;
    if (this.y < gameHeight / 2) this.y = gameHeight / 2;
  }

  moveDown() {
    this.y += this.speed;
    if (this.y > gameHeight - 20) this.y = gameHeight - 20;
  }

  shoot() {
    let bulletCount = this.tripleShot ? 3 : (this.numShips === 1 ? 1 : 2);
    let offset = this.tripleShot ? 20 : (this.numShips === 1 ? 0 : 15);
    for (let i = 0; i < bulletCount; i++) {
      let xOffset = (i - (bulletCount - 1) / 2) * 10;
      bullets.push(new Bullet(this.x + xOffset, this.y - 10, -1, true));
    }
    playShootingSound();
  }
}

class Enemy {
  constructor(x, y, type, enemyClass) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.enemyClass = enemyClass;
    this.speed = 1;
    this.direction = 1;
    this.captured = false;
    this.health = 1;
  }

  update() {
    if (stage % 5 === 0) {
      this.x += this.speed * this.direction;
      if (this.x < (gameWidth / 2 - 150) || this.x > (gameWidth / 2 + 150)) this.direction *= -1;
      this.y += 0.1;
      if (this.y > 150) this.y = 150;
    } else {
      this.x += this.speed * this.direction;
      if (this.x < 20 || this.x > gameWidth - 20) {
        this.direction *= -1;
        this.y += 20;
      }
      let captureRange = 50 + (stage - 1) * 5;
      if (this.type === 1 && !this.captured && dist(this.x, this.y, player.x, player.y) < captureRange) {
        this.captured = true;
        player.lives--;
        if (player.numShips === 2) player.numShips = 1;
        if (player.lives > 0) {
          setTimeout(() => {
            player.x = gameWidth / 2;
            player.y = gameHeight - 20;
          }, 1000);
        } else {
          gameState = "gameover"; // Show "GAME OVER" first
          setTimeout(() => {
            window.showNameInput(player.score); // Use HTML overlay for name input
          }, 2000); // Transition to name input after 2 seconds
        }
        playHitSound();
      }
    }
  }

  draw() {
    if (stage % 5 === 0) {
      image(starlinkMinion, this.x - 30, this.y - 30, 60, 60);
    } else {
      let frame;
      if (this.enemyClass === 'Big') {
        frame = this.type === 0 ? redBigFrame : greenBigFrame;
        image(bigEnemyFrames[frame], this.x - 25, this.y - 43, 50, 85);
      } else if (this.enemyClass === 'Mid') {
        frame = this.type === 0 ? redMidFrame : greenMidFrame;
        image(midEnemyFrames[frame], this.x - 25, this.y - 43, 50, 85);
      } else if (this.enemyClass === 'Small') {
        frame = this.type === 0 ? redSmallFrame : greenSmallFrame;
        image(smallEnemyFrames[frame], this.x - 25, this.y - 43, 50, 85);
      } else {
        frame = this.type === 0 ? redMicroFrame : greenMicroFrame;
        image(microEnemyFrames[frame], this.x - 25, this.y - 43, 50, 85);
      }
      if (this.type === 1 && this.captured) {
        fill(255);
        triangle(this.x, this.y + 43, this.x - 25, this.y + 85, this.x + 25, this.y + 85);
      }
    }
  }
}

class Boss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 2;
    this.direction = 1;
    this.health = 20 + (stage - 1) * 5;
    this.shootTimer = 0;
    this.laserTimer = 0;
  }

  update() {
    this.x += this.speed * this.direction;
    if (this.x < 50 || this.x > gameWidth - 50) this.direction *= -1;
    this.y += 0.1;
    if (this.y > 150) this.y = 150;
  }

  shoot() {
    this.shootTimer--;
    if (this.shootTimer <= 0) {
      for (let i = -1; i <= 1; i += 2) {
        bullets.push(new Bullet(this.x + i * 30, this.y + 20, 1, false, true));
      }
      this.shootTimer = 90;
      playShootingSound();
    }

    this.laserTimer--;
    if (this.laserTimer <= 0 && random() < 0.05) {
      for (let x = 50; x < gameWidth - 50; x += 40) {
        bullets.push(new Bullet(x, this.y + 20, 1, false, true));
      }
      this.laserTimer = 300;
      playExplosionSound();
    }
  }

  draw() {
    image(teslaBoss, this.x - 30, this.y - 30, 60, 60);
    fill(255, 0, 0);
    rect(this.x - 30, this.y - 40, 60, 5);
    fill(0, 255, 0);
    rect(this.x - 30, this.y - 40, 60 * (this.health / (20 + (stage - 1) * 5)), 5);
  }
}

class Bullet {
  constructor(x, y, dir, isPlayer, isBoss = false) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.speed = isPlayer ? 10 : (isBoss ? 8 : 5);
    this.isPlayer = isPlayer;
    this.isBoss = isBoss;
  }

  update() {
    this.y += this.dir * this.speed;
  }

  draw() {
    if (this.isPlayer) {
      push();
      translate(this.x, this.y);
      if (this.dir === -1) rotate(PI);
      image(laserBeam, -5, -15, 10, 30);
      pop();
    } else if (this.isBoss) {
      push();
      translate(this.x, this.y);
      if (this.dir === -1) rotate(PI);
      image(bossBeam, -10, -30, 20, 60);
      pop();
    } else {
      push();
      translate(this.x, this.y);
      if (this.dir === -1) rotate(PI);
      image(minionBeam, -5, -15, 10, 30);
      pop();
    }
  }

  offscreen() {
    return this.y < 0 || this.y > gameHeight;
  }
}

class Explosion {
  constructor(x, y) {
    this.particles = [];
    for (let i = 0; i < 10; i++) {
      let angle = random(TWO_PI);
      let speed = random(2, 5);
      this.particles.push({
        x: x,
        y: y,
        vx: cos(angle) * speed,
        vy: sin(angle) * speed,
        size: random(2, 5),
        alpha: 255
      });
    }
    this.done = false;
  }

  update() {
    for (let particle of this.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.alpha -= 10;
      if (particle.alpha <= 0) particle.done = true;
    }
    this.particles = this.particles.filter(p => !p.done);
    this.done = this.particles.length === 0;
  }

  draw() {
    noStroke();
    for (let particle of this.particles) {
      fill(255, particle.alpha);
      ellipse(particle.x, particle.y, particle.size, particle.size);
    }
  }
}

class Upgrade {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.speed = 2;
    this.lifetime = 300;
    this.frame = 0;
    this.frameTimer = 0;
  }

  update() {
    this.y += this.speed;
    this.lifetime--;
    this.frameTimer++;
    if (this.frameTimer >= 10) {
      this.frameTimer = 0;
      this.frame = (this.frame + 1) % (this.type === 0 ? 5 : 6);
    }
  }

  draw() {
    if (this.type === 0) {
      image(firepowerSheet, this.x - 14.5, this.y - 16, 29, 32, 0, this.frame * 32, 29, 32);
    } else {
      image(heartSpinSheet, this.x - 8, this.y - 8.5, 16, 17, this.frame * 16, 0, 16, 17);
    }
  }

  offscreen() {
    return this.y > gameHeight;
  }

  apply(player) {
    if (this.type === 0) {
      player.tripleShot = true;
      player.tripleShotTimer = 600;
    } else {
      player.lives = min(player.lives + 1, 5);
    }
  }
}

function playShootingSound() {
  shootOsc.setType('square');
  shootOsc.freq(1000);
  shootOsc.amp(0.5, 0.01);
  shootOsc.freq(200, 0.1);
  setTimeout(() => shootOsc.amp(0, 0.05), 150);
}

function playExplosionSound() {
  explodeOsc.freq(220);
  explodeOsc.amp(0.5, 0.01);
  setTimeout(() => {
    explodeOsc.freq(110, 0.2);
    explodeOsc.amp(0, 0.2);
  }, 20);
}

function playHitSound() {
  hitOsc.amp(0.5, 0.01);
  setTimeout(() => hitOsc.amp(0, 0.1), 100);
}

function playPowerUpSound() {
  shootOsc.setType('sine');
  shootOsc.freq(660);
  shootOsc.amp(0.5, 0.01);
  setTimeout(() => shootOsc.amp(0, 0.1), 100);
}

// Leaderboard functions with Firebase (required for online storage)
function loadLeaderboard() {
  if (!window.database) {
    console.error('Firebase database not initialized, leaderboard will not load from server');
    leaderboard = []; // Empty until Firebase initializes or fails permanently
    alert('Failed to load leaderboard from server. Please check your internet connection or contact support.');
    return;
  }
  window.database.ref('leaderboard').once('value', snapshot => {
    leaderboard = Object.values(snapshot.val() || []).sort((a, b) => b.score - a.score).slice(0, 5);
    console.log('Loaded leaderboard from Firebase:', leaderboard);
  }, error => {
    console.error('Error loading leaderboard from Firebase:', error);
    leaderboard = []; // Empty if Firebase fails
    alert('Error loading leaderboard from server. Please try again or contact support.');
  });
}

function addToLeaderboard(name, score) {
  if (!window.database) {
    console.error('Firebase database not initialized, scores cannot be saved to server');
    alert('Unable to save score to server. Please check your internet connection or contact support.');
    return;
  }
  console.log('Adding to leaderboard:', { name, score });
  window.database.ref('leaderboard').push({ name, score }, error => {
    if (error) {
      console.error('Error pushing to Firebase:', error);
      alert('Error saving score to server. Please try again or contact support.');
    } else {
      window.database.ref('leaderboard').once('value', snapshot => {
        leaderboard = Object.values(snapshot.val() || []).sort((a, b) => b.score - a.score).slice(0, 5);
        console.log('Updated leaderboard from Firebase:', leaderboard);
      }, error => {
        console.error('Error updating leaderboard from Firebase:', error);
        alert('Error saving score to server. Please try again or contact support.');
      });
    }
  });
}
