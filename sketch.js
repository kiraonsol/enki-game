// Global variables
let player;
let enemies = [];
let bullets = [];
let explosions = [];
let upgrades = [];
let gameState = "start";
let stage = 1;
let levelTransition = false;
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
let leaderboard = [];
let playerName = "";
let boss = null;
let minions = [];
let gameWidth = 400;
let gameHeight = 600;
let scalingFactor = 1;
let countdown = 3000; // 3-second countdown in milliseconds
let countdownStart = 0; // Time when countdown starts

let database = window.database;

const SHOW_LEADERBOARD = true;
const MAX_UPGRADES = 5; // Maximum number of upgrades on screen at once

function preload() {
  console.log('preload called');
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
}

function setup() {
  console.log('setup called');
  // Use Telegram WebApp viewport dimensions if available
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    Telegram.WebApp.expand(); // Ensure WebApp is expanded
    viewportWidth = Telegram.WebApp.viewportWidth || window.innerWidth;
    viewportHeight = Telegram.WebApp.viewportStableHeight || window.innerHeight;
    console.log('Using Telegram viewport:', viewportWidth, viewportHeight);
    // Sometimes Telegram viewport data isn't immediately available, so retry after a short delay
    setTimeout(resizeCanvasForViewport, 500);
  } else {
    console.log('Using window dimensions:', viewportWidth, viewportHeight);
  }

  // Calculate game dimensions to fill the viewport while maintaining aspect ratio
  const designAspectRatio = 400 / 600; // Original design aspect ratio
  const viewportAspectRatio = viewportWidth / viewportHeight;

  if (viewportAspectRatio > designAspectRatio) {
    // Viewport is wider than design aspect ratio, fit to height
    gameHeight = viewportHeight;
    gameWidth = gameHeight * designAspectRatio;
    scalingFactor = viewportHeight / 600;
  } else {
    // Viewport is taller than design aspect ratio, fit to width
    gameWidth = viewportWidth;
    gameHeight = gameWidth / designAspectRatio;
    scalingFactor = viewportWidth / 400;
  }

  createCanvas(viewportWidth, viewportHeight);
  console.log('Canvas size:', width, height);
  console.log('Game dimensions:', gameWidth, gameHeight);
  console.log('Scaling factor:', scalingFactor);

  // Initialize stars
  stars = [];
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: random(gameWidth),
      y: random(gameHeight),
      speed: random(1, 5)
    });
  }
  console.log('stars initialized:', stars.length);

  enemies = [];
  bullets = [];
  explosions = [];
  upgrades = [];
  minions = [];
  leaderboard = [];

  if (window.firebaseReady && window.database) {
    console.log('Loading leaderboard...');
    loadLeaderboard().then(() => {
      console.log('Leaderboard loaded in setup:', leaderboard);
    });
  } else {
    console.error('Firebase not initialized, leaderboard will not load from server');
    leaderboard = [];
  }

  selectEnemyFrames();

  // Listen for viewport changes (e.g., keyboard open/close)
  if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    Telegram.WebApp.onEvent('viewportChanged', () => {
      console.log('Viewport changed, updating canvas...');
      resizeCanvasForViewport();
    });
  }
}

function resizeCanvasForViewport() {
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    Telegram.WebApp.expand(); // Re-expand to ensure full viewport
    viewportWidth = Telegram.WebApp.viewportWidth || window.innerWidth;
    viewportHeight = Telegram.WebApp.viewportStableHeight || window.innerHeight;
    console.log('Viewport changed to:', viewportWidth, viewportHeight);
  }

  const designAspectRatio = 400 / 600;
  const viewportAspectRatio = viewportWidth / viewportHeight;

  if (viewportAspectRatio > designAspectRatio) {
    gameHeight = viewportHeight;
    gameWidth = gameHeight * designAspectRatio;
    scalingFactor = viewportHeight / 600;
  } else {
    gameWidth = viewportWidth;
    gameHeight = gameWidth / designAspectRatio;
    scalingFactor = viewportWidth / 400;
  }

  resizeCanvas(viewportWidth, viewportHeight);
  console.log('Canvas resized to:', width, height);
  console.log('Game dimensions:', gameWidth, gameHeight);
  console.log('Scaling factor:', scalingFactor);

  // Reposition stars to fit new game dimensions
  for (let star of stars) {
    star.x = random(gameWidth);
    star.y = random(gameHeight);
  }
}

function windowResized() {
  resizeCanvasForViewport();
}

function draw() {
  try {
    background(0);
    scale(scalingFactor);

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
      let logoWidth = gameWidth * 0.55; // Scale logo proportionally
      let logoAspectRatio = enkiiLogo.width / enkiiLogo.height;
      let logoHeight = logoWidth / logoAspectRatio;
      image(enkiiLogo, gameWidth / 2 - logoWidth / 2, 30 * (gameHeight / 600), logoWidth, logoHeight);
      if (frameCount % 60 < 30) {
        fill(255);
        textSize(16 / scalingFactor);
        textAlign(CENTER);
        text("Tap to start", gameWidth / 2, gameHeight - 50 * (gameHeight / 600));
      }
    } else if (gameState === "playing") {
      if (!touches.length > 0) {
        if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
          player.moveLeft();
        }
        if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
          player.moveRight();
        }
        if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
          player.moveUp();
        }
        if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
          player.moveDown();
        }
      }

      if (touches.length > 0) {
        let touchX = touches[0].x / scalingFactor;
        let touchY = touches[0].y / scalingFactor;

        const offsetX = 0;
        const offsetY = -50 * (gameHeight / 600);

        player.x = constrain(touchX + offsetX, 10, gameWidth - 10);
        player.y = constrain(touchY + offsetY, gameHeight / 2, gameHeight - 20 * (gameHeight / 600));

        if (player.shootTimer <= 0) {
          let playerBullets = bullets.filter(b => b.dir === -1 && b.isPlayer).length;
          if (playerBullets < player.numShips * 2) {
            player.shoot();
            player.shootTimer = 10;
          }
        }
      }
      if (player.shootTimer > 0) player.shootTimer--;

      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        if (bullets[i].offscreen()) {
          bullets.splice(i, 1);
        }
      }

      if (stage % 5 === 0) {
        if (boss) {
          boss.update();
          boss.shoot();
        }
        if (!minions || !Array.isArray(minions)) {
          console.error('minions is undefined or not an array:', minions);
          minions = [];
        }
        for (let i = minions.length - 1; i >= 0; i--) {
          minions[i].update();
          let shootChance = 0.004;
          if (random() < shootChance) {
            bullets.push(new Bullet(minions[i].x, minions[i].y + 10, 1, false));
          }
        }
      } else {
        if (!enemies || !Array.isArray(enemies)) {
          console.error('enemies is undefined or not an array:', enemies);
          enemies = [];
        }
        for (let enemy of enemies) {
          enemy.update();
          let shootChance = 0.005 + (stage - 1) * 0.002;
          if (random() < shootChance) {
            bullets.push(new Bullet(enemy.x, enemy.y + 10, 1, false));
          }
        }
      }

      for (let i = upgrades.length - 1; i >= 0; i--) {
        let upgrade = upgrades[i];
        upgrade.update();
        if (upgrade.offscreen() || upgrade.lifetime <= 0) {
          upgrades.splice(i, 1);
        }
      }

      for (let i = bullets.length - 1; i >= 0; i--) {
        let bullet = bullets[i];
        if (bullet.dir === -1) {
          if (stage % 5 === 0) {
            if (boss && dist(bullet.x, bullet.y, boss.x, boss.y) < 30) {
              boss.health--;
              bullets.splice(i, 1);
              if (boss.health <= 0) {
                let bossX = boss.x;
                let bossY = boss.y;
                explosions.push(new Explosion(bossX, bossY));
                boss = null;
                minions = [];
                playExplosionSound();
                if (random() < 0.3 && upgrades.length < MAX_UPGRADES) {
                  upgrades.push(new Upgrade(bossX, bossY, floor(random(2))));
                }
              }
            }
            if (!minions || !Array.isArray(minions)) {
              console.error('minions is undefined or not an array during collision check:', minions);
              minions = [];
            }
            for (let j = minions.length - 1; j >= 0; j--) {
              let minion = minions[j];
              if (dist(bullet.x, bullet.y, minion.x, minion.y) < 30) {
                minion.health--;
                if (minion.health <= 0) {
                  explosions.push(new Explosion(minion.x, minion.y));
                  minions.splice(j, 1);
                }
                bullets.splice(i, 1);
                player.score += 50 * (1 + (stage - 1) * 0.1);
                console.log('Minion killed, new score:', player.score);
                playExplosionSound();
                if (random() < 0.05 && upgrades.length < MAX_UPGRADES) {
                  upgrades.push(new Upgrade(minion.x, minion.y, floor(random(2))));
                }
                break;
              }
            }
          } else {
            if (!enemies || !Array.isArray(enemies)) {
              console.error('enemies is undefined or not an array during collision check:', enemies);
              enemies = [];
            }
            for (let j = enemies.length - 1; j >= 0; j--) {
              let enemy = enemies[j];
              if (dist(bullet.x, bullet.y, enemy.x, enemy.y) < 25) {
                enemy.health--;
                if (enemy.health <= 0) {
                  explosions.push(new Explosion(enemy.x, enemy.y));
                  if (enemy.type === 1 && enemy.captured) {
                    player.numShips = 2;
                  }
                  enemies.splice(j, 1);
                }
                player.score += 100 * (1 + (stage - 1) * 0.1);
                console.log('Enemy killed, new score:', player.score);
                playExplosionSound();
                if (random() < 0.02 && upgrades.length < MAX_UPGRADES) {
                  upgrades.push(new Upgrade(enemy.x, enemy.y, floor(random(2))));
                }
                bullets.splice(i, 1);
                break;
              }
            }
          }
        } else {
          let targetX = player.x;
          let targetY = player.y;
          let hitRadius = player.numShips === 1 ? 10 : 25;

          if (stage % 5 === 0 && boss) {
            if (bullet.isPlayer === false) {
              if (bullet.isBoss) {
                if (dist(bullet.x, bullet.y, targetX, targetY) < 30) {
                  player.lives--;
                  if (player.numShips === 2) {
                    player.numShips = 1;
                  }
                  bullets.splice(i, 1);
                  playHitSound();
                  if (player.lives <= 0) {
                    gameState = "gameover";
                    countdownStart = millis(); // Start the countdown
                    countdown = 3000; // Reset countdown to 3 seconds
                    setTimeout(() => {
                      window.showNameInput(player.score);
                    }, 2000);
                  } else {
                    player.x = gameWidth / 2;
                    player.y = gameHeight - 20 * (gameHeight / 600);
                  }
                  break;
                }
              } else {
                if (dist(bullet.x, bullet.y, targetX, targetY) < hitRadius) {
                  player.lives--;
                  if (player.numShips === 2) {
                    player.numShips = 1;
                  }
                  bullets.splice(i, 1);
                  playHitSound();
                  if (player.lives <= 0) {
                    gameState = "gameover";
                    countdownStart = millis(); // Start the countdown
                    countdown = 3000; // Reset countdown to 3 seconds
                    setTimeout(() => {
                      window.showNameInput(player.score);
                    }, 2000);
                  } else {
                    player.x = gameWidth / 2;
                    player.y = gameHeight - 20 * (gameHeight / 600);
                  }
                  break;
                }
              }
            }
          } else {
            if (dist(bullet.x, bullet.y, targetX, targetY) < hitRadius) {
              player.lives--;
              if (player.numShips === 2) {
                player.numShips = 1;
              }
              bullets.splice(i, 1);
              playHitSound();
              if (player.lives <= 0) {
                gameState = "gameover";
                countdownStart = millis(); // Start the countdown
                countdown = 3000; // Reset countdown to 3 seconds
                setTimeout(() => {
                  window.showNameInput(player.score);
                }, 2000);
              } else {
                player.x = gameWidth / 2;
                player.y = gameHeight - 20 * (gameHeight / 600);
              }
              break;
            }
          }
        }
      }

      for (let i = upgrades.length - 1; i >= 0; i--) {
        let upgrade = upgrades[i];
        if (dist(player.x, player.y, upgrade.x, upgrade.y) < 30) {
          upgrade.apply(player);
          upgrades.splice(i, 1);
          playPowerUpSound();
        }
      }

      player.draw();
      if (stage % 5 === 0) {
        if (boss) {
          boss.draw();
        }
        if (Array.isArray(minions)) {
          for (let minion of minions) {
            minion.draw();
          }
        } else {
          console.error('minions is undefined or not an array during drawing:', minions);
          minions = [];
        }
      } else {
        if (Array.isArray(enemies)) {
          for (let enemy of enemies) {
            enemy.draw();
          }
        } else {
          console.error('enemies is undefined or not an array during drawing:', enemies);
          enemies = [];
        }
      }
      if (Array.isArray(bullets)) {
        for (let bullet of bullets) {
          bullet.draw();
        }
      } else {
        console.error('bullets is undefined or not an array during drawing:', bullets);
        bullets = [];
      }
      if (Array.isArray(upgrades)) {
        for (let upgrade of upgrades) {
          upgrade.draw();
        }
      } else {
        console.error('upgrades is undefined or not an array during drawing:', upgrades);
        upgrades = [];
      }
      if (!explosions || !Array.isArray(explosions)) {
        console.error('explosions is undefined or not an array:', explosions);
        explosions = [];
      }
      for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].update();
        explosions[i].draw();
        if (explosions[i].done) {
          explosions.splice(i, 1);
        }
      }

      fill(255);
      textSize(16 / scalingFactor);
      textAlign(LEFT);
      text("Score: " + player.score, 10, 20);
      text("Lives: " + player.lives, 10, 40);
      text("Stage: " + stage, 10, 60);
      if (stage % 5 === 0 && boss) {
        text("Boss Health: " + boss.health, 10, 80);
      }

      if (!levelTransition) {
        if (stage % 5 === 0) {
          if (!boss && (Array.isArray(minions) ? minions.length === 0 : true)) {
            levelTransition = true;
            stage++;
            console.log('Boss level completed, advancing to Stage:', stage);
            createEnemies(stage);
            selectEnemyFrames();
            levelTransition = false;
          }
        } else if (Array.isArray(enemies) ? enemies.length === 0 : true) {
          levelTransition = true;
          stage++;
          console.log('Regular level completed, advancing to Stage:', stage);
          if (stage % 5 === 0) {
            spawnBossAndMinions();
          } else {
            createEnemies(stage);
            selectEnemyFrames();
          }
          levelTransition = false;
        }
      }
    } else if (gameState === "gameover") {
      console.log('Rendering game over screen');
      fill(255);
      textSize(32 / scalingFactor);
      textAlign(CENTER);
      text("Game Over", gameWidth / 2, gameHeight / 2 - 150 * (gameHeight / 600));
      textSize(16 / scalingFactor);
      text("Your Score: " + player.score, gameWidth / 2, gameHeight / 2 - 100 * (gameHeight / 600));

      text("Leaderboard:", gameWidth / 2, gameHeight / 2 - 50 * (gameHeight / 600));
      if (SHOW_LEADERBOARD) {
        if (!leaderboard || !Array.isArray(leaderboard)) {
          console.error('leaderboard is undefined or not an array in game over screen:', leaderboard);
          leaderboard = [];
        }
        // Show top 10 scores instead of top 5
        for (let i = 0; i < Math.min(10, leaderboard.length); i++) {
          if (leaderboard[i] && typeof leaderboard[i].name === 'string' && Number.isFinite(leaderboard[i].score)) {
            text(`${i + 1}. ${leaderboard[i].name}: ${leaderboard[i].score}`, gameWidth / 2, gameHeight / 2 + (i * 20 - 30) * (gameHeight / 600));
          } else {
            console.error(`Invalid leaderboard entry at index ${i}:`, leaderboard[i]);
          }
        }
      } else {
        text("Leaderboard disabled for testing", gameWidth / 2, gameHeight / 2);
      }

      // Calculate and display countdown
      let elapsed = millis() - countdownStart;
      countdown = 3000 - elapsed;
      let secondsLeft = Math.ceil(countdown / 1000);
      if (secondsLeft < 0) secondsLeft = 0;
      text(`Restart in ${secondsLeft}...`, gameWidth / 2, gameHeight / 2 + 180 * (gameHeight / 600));
      if (countdown <= 0) {
        text("Tap to restart", gameWidth / 2, gameHeight / 2 + 210 * (gameHeight / 600));
      }
    }
  } catch (error) {
    console.error('Error in draw():', error, error.stack);
    text("Error: " + error.message, gameWidth / 2, gameHeight / 2);
  }
}

function touchStarted() {
  // Initialize audio on first user interaction
  if (!shootOsc) {
    console.log('Initializing audio oscillators...');
    try {
      // Resume AudioContext
      getAudioContext().resume().then(() => {
        console.log('AudioContext resumed');
        shootOsc = new p5.Oscillator('sine');
        shootOsc.amp(0);
        shootOsc.freq(440);
        shootOsc.start();

        explodeOsc = new p5.Oscillator('square');
        explodeOsc.amp(0);
        explodeOsc.freq(220);
        explodeOsc.start();

        hitOsc = new p5.Oscillator('triangle');
        hitOsc.amp(0);
        hitOsc.freq(110);
        hitOsc.start();

        console.log('Audio oscillators initialized');
      });
    } catch (error) {
      console.error('Error initializing audio oscillators:', error);
    }
  }

  if ((gameState === "start" || (gameState === "gameover" && countdown <= 0)) && !window.nameInputVisible) {
    startGame();
  }
  return false;
}

function keyPressed() {
  if (!touches.length > 0) {
    if (gameState === "start" && key !== " ") {
      startGame();
    } else if (gameState === "playing" && key === " ") {
      let playerBullets = bullets.filter(b => b.dir === -1 && b.isPlayer).length;
      if (playerBullets < player.numShips * 2) {
        player.shoot();
      }
    } else if (gameState === "gameover" && countdown <= 0) {
      startGame();
    }
  }
  if (window.nameInputVisible && (gameState === "start" || gameState === "gameover")) {
    return false;
  }
}

function startGame() {
  console.log('startGame called');
  player = new Player();
  enemies = [];
  bullets = [];
  explosions = [];
  upgrades = [];
  stage = 1;
  levelTransition = false;
  playerName = "";
  boss = null;
  minions = [];
  gameState = "playing";
  createEnemies(stage);
  selectEnemyFrames();
}

function createEnemies(stage) {
  enemies = [];
  if (stage % 5 !== 0) {
    let rows = 3 + Math.floor(stage / 5);
    let cols = 5 + Math.floor(stage / 10);
    cols = min(cols, 7);
    rows = min(rows, 5);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        let type = j === 0 ? 1 : 0;
        let x = 25 * (gameWidth / 400) + i * (gameWidth - 50 * (gameWidth / 400)) / (cols - 1);
        let y = 50 * (gameHeight / 600) + j * 60 * (gameHeight / 600);
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
  boss = new Boss(gameWidth / 2, 50 * (gameHeight / 600));
  minions = [
    new Enemy(gameWidth / 2 - 100 * (gameWidth / 400), 100 * (gameHeight / 600), 0, 'Starlink'),
    new Enemy(gameWidth / 2 + 100 * (gameWidth / 400), 100 * (gameHeight / 600), 0, 'Starlink')
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
    this.y = gameHeight - 20 * (gameHeight / 600);
    this.speed = 5;
    this.lives = 3;
    this.score = 0;
    this.numShips = 1;
    this.tripleShot = false;
    this.tripleShotTimer = 0;
    this.shootTimer = 0;
  }

  draw() {
    let frame = this.numShips === 1 ? floor(frameCount / 10) % 3 : (frameCount % 60 < 30 ? 1 : 2);
    image(playerSprite, this.x - 24 * (gameWidth / 400), this.y - 24 * (gameHeight / 600), 48 * (gameWidth / 400), 48 * (gameHeight / 600), frame * 48, 0, 48, 48);
    if (this.tripleShot) {
      this.tripleShotTimer--;
      if (this.tripleShotTimer <= 0) this.tripleShot = false;
    }
  }

  moveLeft() {
    this.x -= this.speed;
    if (this.x < 10 * (gameWidth / 400)) this.x = 10 * (gameWidth / 400);
  }

  moveRight() {
    this.x += this.speed;
    if (this.x > gameWidth - 10 * (gameWidth / 400)) this.x = gameWidth - 10 * (gameWidth / 400);
  }

  moveUp() {
    this.y -= this.speed;
    if (this.y < gameHeight / 2) this.y = gameHeight / 2;
  }

  moveDown() {
    this.y += this.speed;
    if (this.y > gameHeight - 20 * (gameHeight / 600)) this.y = gameHeight - 20 * (gameHeight / 600);
  }

  shoot() {
    let bulletCount = this.tripleShot ? 3 : (this.numShips === 1 ? 1 : 2);
    let offset = this.tripleShot ? 20 * (gameWidth / 400) : (this.numShips === 1 ? 0 : 15 * (gameWidth / 400));
    for (let i = 0; i < bulletCount; i++) {
      let xOffset = (i - (bulletCount - 1) / 2) * 10 * (gameWidth / 400);
      bullets.push(new Bullet(this.x + xOffset, this.y - 10 * (gameHeight / 600), -1, true));
    }
    playShootingSound();
  }
}

class Enemy {
  constructor(x, y, type, enemyClass) {
    this.x = x ?? 0;
    this.y = y ?? 0;
    this.type = type ?? 0;
    this.enemyClass = enemyClass || 'Micro';
    this.speed = 1;
    this.direction = 1;
    this.captured = false;
    this.health = 1;
  }

  update() {
    if (stage % 5 === 0) {
      this.x += this.speed * this.direction;
      if (this.x < (gameWidth / 2 - 150 * (gameWidth / 400)) || this.x > (gameWidth / 2 + 150 * (gameWidth / 400))) this.direction *= -1;
      this.y += 0.1 * (gameHeight / 600);
      if (this.y > 150 * (gameHeight / 600)) this.y = 150 * (gameHeight / 600);
    } else {
      this.x += this.speed * this.direction;
      if (this.x < 20 * (gameWidth / 400) || this.x > gameWidth - 20 * (gameWidth / 400)) {
        this.direction *= -1;
        this.y += 20 * (gameHeight / 600);
      }
      let captureRange = 50 * (gameWidth / 400) + (stage - 1) * 5;
      if (this.type === 1 && !this.captured && dist(this.x, this.y, player.x, player.y) < captureRange) {
        this.captured = true;
        player.lives--;
        if (player.numShips === 2) player.numShips = 1;
        if (player.lives > 0) {
          setTimeout(() => {
            player.x = gameWidth / 2;
            player.y = gameHeight - 20 * (gameHeight / 600);
          }, 1000);
        } else {
          gameState = "gameover";
          countdownStart = millis(); // Start the countdown
          countdown = 3000; // Reset countdown to 3 seconds
          setTimeout(() => {
            window.showNameInput(player.score);
          }, 2000);
        }
        playHitSound();
      }
    }
  }

  draw() {
    if (stage % 5 === 0) {
      image(starlinkMinion, this.x - 30 * (gameWidth / 400), this.y - 30 * (gameHeight / 600), 60 * (gameWidth / 400), 60 * (gameHeight / 600));
    } else {
      let frame;
      if (this.enemyClass === 'Big') {
        frame = this.type === 0 ? redBigFrame : greenBigFrame;
        image(bigEnemyFrames[frame], this.x - 25 * (gameWidth / 400), this.y - 43 * (gameHeight / 600), 50 * (gameWidth / 400), 85 * (gameHeight / 600));
      } else if (this.enemyClass === 'Mid') {
        frame = this.type === 0 ? redMidFrame : greenMidFrame;
        image(midEnemyFrames[frame], this.x - 25 * (gameWidth / 400), this.y - 43 * (gameHeight / 600), 50 * (gameWidth / 400), 85 * (gameHeight / 600));
      } else if (this.enemyClass === 'Small') {
        frame = this.type === 0 ? redSmallFrame : greenSmallFrame;
        image(smallEnemyFrames[frame], this.x - 25 * (gameWidth / 400), this.y - 43 * (gameHeight / 600), 50 * (gameWidth / 400), 85 * (gameHeight / 600));
      } else {
        frame = this.type === 0 ? redMicroFrame : greenMicroFrame;
        image(microEnemyFrames[frame], this.x - 25 * (gameWidth / 400), this.y - 43 * (gameHeight / 600), 50 * (gameWidth / 400), 85 * (gameHeight / 600));
      }
      if (this.type === 1 && this.captured) {
        fill(255);
        triangle(this.x, this.y + 43 * (gameHeight / 600), this.x - 25 * (gameWidth / 400), this.y + 85 * (gameHeight / 600), this.x + 25 * (gameWidth / 400), this.y + 85 * (gameHeight / 600));
      }
    }
  }
}

class Boss {
  constructor(x, y) {
    this.x = x ?? 0;
    this.y = y ?? 0;
    this.speed = 2;
    this.direction = 1;
    this.health = 20 + (stage - 1) * 5;
    this.shootTimer = 0;
    this.laserTimer = 0;
  }

  update() {
    this.x += this.speed * this.direction;
    if (this.x < 50 * (gameWidth / 400) || this.x > gameWidth - 50 * (gameWidth / 400)) this.direction *= -1;
    this.y += 0.1 * (gameHeight / 600);
    if (this.y > 150 * (gameHeight / 600)) this.y = 150 * (gameHeight / 600);
  }

  shoot() {
    this.shootTimer--;
    if (this.shootTimer <= 0) {
      for (let i = -1; i <= 1; i += 2) {
        bullets.push(new Bullet(this.x + i * 30 * (gameWidth / 400), this.y + 20 * (gameHeight / 600), 1, false, true));
      }
      this.shootTimer = 90;
      playShootingSound();
    }

    this.laserTimer--;
    if (this.laserTimer <= 0 && random() < 0.05) {
      for (let x = 50 * (gameWidth / 400); x < gameWidth - 50 * (gameWidth / 400); x += 40 * (gameWidth / 400)) {
        bullets.push(new Bullet(x, this.y + 20 * (gameHeight / 600), 1, false, true));
      }
      this.laserTimer = 300;
      playExplosionSound();
    }
  }

  draw() {
    image(teslaBoss, this.x - 30 * (gameWidth / 400), this.y - 30 * (gameHeight / 600), 60 * (gameWidth / 400), 60 * (gameHeight / 600));
    fill(255, 0, 0);
    rect(this.x - 30 * (gameWidth / 400), this.y - 40 * (gameHeight / 600), 60 * (gameWidth / 400), 5 * (gameHeight / 600));
    fill(0, 255, 0);
    rect(this.x - 30 * (gameWidth / 400), this.y - 40 * (gameHeight / 600), 60 * (gameWidth / 400) * (this.health / (20 + (stage - 1) * 5)), 5 * (gameHeight / 600));
  }
}

class Bullet {
  constructor(x, y, dir, isPlayer, isBoss = false) {
    this.x = x ?? 0;
    this.y = y ?? 0;
    this.dir = dir ?? -1;
    this.speed = isPlayer ? 10 : (isBoss ? 8 : 5);
    this.isPlayer = isPlayer ?? true;
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
      image(laserBeam, -5 * (gameWidth / 400), -15 * (gameHeight / 600), 10 * (gameWidth / 400), 30 * (gameHeight / 600));
      pop();
    } else if (this.isBoss) {
      push();
      translate(this.x, this.y);
      if (this.dir === -1) rotate(PI);
      image(bossBeam, -10 * (gameWidth / 400), -30 * (gameHeight / 600), 20 * (gameWidth / 400), 60 * (gameHeight / 600));
      pop();
    } else {
      push();
      translate(this.x, this.y);
      if (this.dir === -1) rotate(PI);
      image(minionBeam, -5 * (gameWidth / 400), -15 * (gameHeight / 600), 10 * (gameWidth / 400), 30 * (gameHeight / 600));
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
        x: x ?? 0,
        y: y ?? 0,
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
      ellipse(particle.x, particle.y, particle.size * (gameWidth / 400), particle.size * (gameHeight / 600));
    }
  }
}

class Upgrade {
  constructor(x, y, type) {
    this.x = x ?? 0;
    this.y = y ?? 0;
    this.type = type ?? 0;
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
      image(firepowerSheet, this.x - 14.5 * (gameWidth / 400), this.y - 16 * (gameHeight / 600), 29 * (gameWidth / 400), 32 * (gameHeight / 600), 0, this.frame * 32, 29, 32);
    } else {
      image(heartSpinSheet, this.x - 8 * (gameWidth / 400), this.y - 8.5 * (gameHeight / 600), 16 * (gameWidth / 400), 17 * (gameHeight / 600), this.frame * 16, 0, 16, 17);
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
      player.lives++; // Removed the cap: previously player.lives = min(player.lives + 1, 5);
    }
  }
}

function playShootingSound() {
  if (shootOsc) {
    shootOsc.setType('square');
    shootOsc.freq(1000);
    shootOsc.amp(0.5, 0.01);
    shootOsc.freq(200, 0.1);
    setTimeout(() => shootOsc.amp(0, 0.05), 150);
  }
}

function playExplosionSound() {
  if (explodeOsc) {
    explodeOsc.freq(220);
    explodeOsc.amp(0.5, 0.01);
    setTimeout(() => {
      explodeOsc.freq(110, 0.2);
      explodeOsc.amp(0, 0.2);
    }, 20);
  }
}

function playHitSound() {
  if (hitOsc) {
    hitOsc.amp(0.5, 0.01);
    setTimeout(() => hitOsc.amp(0, 0.1), 100);
  }
}

function playPowerUpSound() {
  if (shootOsc) {
    shootOsc.setType('sine');
    shootOsc.freq(660);
    shootOsc.amp(0.5, 0.01);
    setTimeout(() => shootOsc.amp(0, 0.1), 100);
  }
}

function loadLeaderboard() {
  return new Promise((resolve, reject) => {
    if (!window.database) {
      console.error('Firebase database not initialized, leaderboard will not load from server');
      leaderboard = [];
      alert('Failed to load leaderboard from server. Please check your internet connection or contact support.');
      resolve();
      return;
    }
    window.database.ref('leaderboard').once('value', snapshot => {
      const data = snapshot.val();
      leaderboard = data ? Object.values(data).sort((a, b) => b.score - a.score).slice(0, 10) : []; // Updated to top 10
      console.log('Loaded leaderboard from Firebase:', leaderboard);
      resolve();
    }, error => {
      console.error('Error loading leaderboard from Firebase:', error);
      leaderboard = [];
      alert('Error loading leaderboard from server. Please try again or contact support.');
      resolve();
    });
  });
}

function addToLeaderboard(name, score) {
  return new Promise((resolve, reject) => {
    if (!window.database) {
      console.error('Firebase database not initialized, scores cannot be saved to server');
      alert('Unable to save score to server. Please check your internet connection or contact support.');
      resolve();
      return;
    }
    console.log('Attempting to add to leaderboard:', { name, score });
    window.database.ref('leaderboard').push({ name, score }, error => {
      if (error) {
        console.error('Error pushing to Firebase:', error);
        console.error('Error stack:', error.stack);
        alert('Error saving score to server. Please try again or contact support.');
        reject(error);
      } else {
        console.log('Score successfully pushed to Firebase');
        window.database.ref('leaderboard').once('value', snapshot => {
          const data = snapshot.val();
          leaderboard = data ? Object.values(data).sort((a, b) => b.score - a.score).slice(0, 10) : []; // Updated to top 10
          console.log('Updated leaderboard from Firebase:', leaderboard);
          resolve();
        }, error => {
          console.error('Error updating leaderboard from Firebase:', error);
          leaderboard = [];
          alert('Error saving score to server. Please try again or contact support.');
          resolve();
        });
      }
    });
  });
}
