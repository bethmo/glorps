// glorps.js


$(document).ready(function () {
    $("#mainScreen").hide();
    setUpCanvas();
    initSound();
    loadImages();
    initLevelButtons();
});

function whenAllResourcesHaveLoaded() {
    $("#loading").hide();
    $(".levelButton").prop("disabled", false);
}

function initLevelButtons() {
    levels.forEach(function (level, index) {
        var button = $("#templates .levelButton").clone();
        button.find(".levelButtonNumber").text(index + 1);
        button.find(".levelButtonName").html(level.name || "&nbsp;");
        $("#levelButtons").append(button);
        button.prop("disabled", true);
        button.click(function (event) {
            initLevel(level, button);
        });
    });
}

const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;
const BASE_SPEED = 5;
const ROTATION_SPEED = 6;
const BULLET_SPEED = 10;
const BUMP_TICKS = 2;
const TICKS_PER_SECOND = 60;

const GLORP_IMAGE_FILE = "glorps.png";
const EXIT_IMAGE_FILE = "topWall.png";
const WALL_IMAGE_FILE = "brickWalls.png";
const HOLE_IMAGE_FILE = "hole.png";
const DROPPER_IMAGE_FILE = "dropper.png";
const SPLAT_SOUND = "splat.mp3";

const HOLE_WIDTH = 100;
const HOLE_HEIGHT = 40;
const DROPPER_WIDTH = 150;
const DROPPER_HEIGHT = 76;
const DROPPER_SPEED = 3;
const DROP_CHANCE_PER_TICK = 0.05;
const DROP_WALL_SIZES = [[10, 10], [30, 10], [10, 30]];
const TICKS_BETWEEN_DROPPERS = 300;
const DROPPER_DEATH_TICKS = 30;
const GLORP_WIDTH = 50;
const GLORP_HEIGHT = 50;
const GLORP_START_Y = GAME_HEIGHT - GLORP_HEIGHT - 10;
const GUN_WIDTH = 10;
const GUN_HEIGHT = 26;
const GUN_OFFSET_X = 20;
const GUN_OFFSET_Y = -13;
const BULLET_RADIUS = 5;
const EXIT_RADIUS_SQUARED = 100;
const FALL_TICKS = 30;

// states
const NORMAL = "normal";
const DEAD = "dead";
const FALLING = "falling";
const RISING = "rising";

var resourcesNeeded = 0;
var resourcesLoaded = 0;
var numberParked;
var paused = false;
var currentLevelButton;
var drawingSurface;
var keysDown = {}; // map keycode to true or false
var activeGlorp = 1;
var sprites = [];
var glorps = [];
var walls = [];
var holes = [];
var shootable = [];
var exits = [
    null,
    { x: 172, y: 74 },
    { x: 312, y: 74 },
    { x: 450, y: 74 },
    { x: 594, y: 74 },
    { x: 740, y: 74 }
];
var ticksUntilNextDropper;
var bump_tick = 0;
var exitImage = startLoadingImage(EXIT_IMAGE_FILE);


function setUpCanvas() {
    var canvas = document.getElementById('myCanvas');
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    drawingSurface = canvas.getContext('2d');

    drawingSurface.font = "30px Arial";
    drawingSurface.textAlign = "center";
    drawingSurface.fillText("Loading, please wait...", canvas.width / 2, canvas.height / 2);

}

function initSound() {
    resourcesNeeded++;
    sounds.whenLoaded = whenSomethingHasLoaded;
    sounds.load([
      SPLAT_SOUND
    ]);
}

function setUpEventHandlers() {
    keysDown = {};
    $(document).keydown(keyDownHandler);
    $(document).keyup(keyUpHandler);
}

function removeEventHandlers() {
    $(document).off("keydown");
    $(document).off("keyup");
    keysDown = {};
}

function pressEnterClicksButton(button) {
    $(document).keydown(function (event) {
        if (event.keyCode == ENTER) {
            $(document).off("keydown");
            button.click();
        }
    });
}

function keyDownHandler() {
    if (paused && event.keyCode != ESC) {
        return;
    }
    keysDown[event.keyCode] = true;
    // Add code here for things that trigger on keypress
    if ((event.keyCode >= KEY_ONE) && (event.keyCode < KEY_ONE + 5)) {
        activeGlorp = event.keyCode - KEY_ONE + 1;
    }
    if (event.key == 'x') {
        // Test code for debugging
        glorps[activeGlorp].state = DEAD;
        sounds[SPLAT_SOUND].play();
    }

    switch (event.keyCode) {
        case ESC:
            togglePause();
            break;
        case SPACEBAR:
            glorps[activeGlorp].shoot();
            break;
    }
}

function keyUpHandler() {
    keysDown[event.keyCode] = false;
}

function loadImages() {
    Glorp.image = startLoadingImage(GLORP_IMAGE_FILE);
    Wall.image = startLoadingImage(WALL_IMAGE_FILE);
    Hole.image = startLoadingImage(HOLE_IMAGE_FILE);
    Dropper.image = startLoadingImage(DROPPER_IMAGE_FILE);
}

function startLoadingImage(filename) {
    resourcesNeeded++;
    var image = new Image();
    image.addEventListener("load", whenSomethingHasLoaded, false);
    image.src = filename;
    return image;
}

function whenSomethingHasLoaded(event) {
    resourcesLoaded++;
    if (resourcesLoaded < resourcesNeeded) {
        return;
    }
    whenAllResourcesHaveLoaded();
}


var Glorp = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    width: GLORP_WIDTH, // NOTE: This is the actual width. Sprite may be drawn smaller when falling in holes.
    height: GLORP_HEIGHT,
    radius: GLORP_WIDTH / 2,
    center: null, // should never be modifying center coordinates of master object!
    rotation: 0,
    image: null,
    controlNumber: 0,
    state: NORMAL,
    sourceX: 0,
    sourceY: 0,
    ticks: 0,
    init: function (number, x, y) {
        this.controlNumber = number;
        this.sourceX = (number - 1) * GLORP_WIDTH;
        this.sourceY = 0;
        this.center = {};
        this.moveCornerTo(x, y);
    },
    moveCornerTo: function (xOrPoint, y) {
        var x = xOrPoint;
        if (typeof xOrPoint == "object") {
            y = x.y;
            x = x.x;
        }
        this.x = x;
        this.y = y;
        this.center.x = x + GLORP_WIDTH/2;
        this.center.y = y + GLORP_HEIGHT/2;
    },
    moveCenterTo: function (xOrPoint, y) {
        var x = xOrPoint;
        if (typeof xOrPoint == "object") {
            y = x.y;
            x = x.x;
        }
        this.center.x = x;
        this.center.y = y;
        this.x = x - GLORP_WIDTH / 2;
        this.y = y - GLORP_HEIGHT / 2;
    },
    overlapsRect: function (rect) {
        var circle = { x: this.center.x, y: this.center.y, radius: this.radius };
        return circleIntersectsRect(circle, rect);
    },
    move: function () {
        var playerCanRotate = (activeGlorp == this.controlNumber);
        var playerCanMove = (playerCanRotate && this.state == NORMAL);

        if (playerCanRotate && keysDown[LEFT_ARROW]) {
            this.rotation = (this.rotation - ROTATION_SPEED) % 360;
        }
        if (playerCanRotate && keysDown[RIGHT_ARROW]) {
            this.rotation = (this.rotation + ROTATION_SPEED) % 360;
        }

        if (this.state == FALLING || this.state == RISING) {
            return this.moveFallingOrRising();
        }

        if (playerCanMove && keysDown[UP_ARROW]) {
            var speed = BASE_SPEED;
            var rotate = this.rotation - 90; // 0 is right, but sprites were drawn pointing up, not right
            var proposedTopLeft = {
                x: this.x + speed * Math.cos(rotate * Math.PI / 180),
                y: this.y + speed * Math.sin(rotate * Math.PI / 180)
            }

            if (!inBounds(proposedTopLeft.x, proposedTopLeft.y) || !inBounds(proposedTopLeft.x + this.width, proposedTopLeft.y + this.height)) {
                hitWall();
                return true;
            }

            var proposedCircle = {
                x: proposedTopLeft.x + this.width / 2,
                y: proposedTopLeft.y + this.height / 2,
                radius: this.radius
            }

            if (findItemOverlappingCircle(walls, proposedCircle)) {
                hitWall();
                return true;
            }

            var hole = findItemOverlappingPoint(holes, proposedCircle);
            if (hole) {
                this.fallIntoHole(hole, proposedCircle);
                return true;
            }

            this.moveCornerTo(proposedTopLeft);
            this.fallIntoExitIfCloseEnough();
        }

        return true;
    },
    render: function () {
        if ((this.state == FALLING || this.state == RISING) && !this.stateTicks) {
            // We would be scaling to zero, so just skip the render
            return;
        }

        var sourceY = (activeGlorp == this.controlNumber ? 0 : GLORP_HEIGHT);
        if (this.state == DEAD) { sourceY = GLORP_HEIGHT * 2; }

        //Save the current state of the drawing surface before it's rotated
        drawingSurface.save();

        //Rotate and possibly scale the canvas

        drawingSurface.translate(this.center.x, this.center.y);

        if (this.state == FALLING || this.state == RISING) {
            var shrinkage = this.stateTicks / FALL_TICKS;
            drawingSurface.scale(shrinkage, shrinkage);
        }

        drawingSurface.rotate(this.rotation * Math.PI / 180);

        drawingSurface.drawImage(
            this.image,
            this.sourceX, sourceY,
            this.width, this.height,
  		    Math.floor(-this.width / 2), Math.floor(-this.height / 2),
            this.width, this.height
        );

        // gun
        drawingSurface.drawImage(
            this.image,
            GLORP_WIDTH*5, (this.state == DEAD ? GLORP_HEIGHT : 0),
            GUN_WIDTH, GUN_HEIGHT,
            Math.floor(-this.width / 2) + GUN_OFFSET_X, Math.floor(-this.height / 2) + GUN_OFFSET_Y,
            GUN_WIDTH, GUN_HEIGHT
        );

        //Restore the drawing surface to its state before it was rotated
        drawingSurface.restore();
    },
    shoot: function () {
        if (this.state != NORMAL) {
            return;
        }
        var bullet = Object.create(Bullet);
        var bullet_start_distance = -GUN_OFFSET_Y + this.height/2;
        var x = this.x + this.width / 2;
        var y = this.y + this.width / 2;
        var rotate = this.rotation - 90; // 0 is right, but sprites were drawn pointing up, not right
        x += bullet_start_distance * Math.cos(rotate * Math.PI / 180);
        y += bullet_start_distance * Math.sin(rotate * Math.PI / 180);
        bullet.init(x, y, this.rotation);
        sprites.push(bullet);
    },
    fallIntoExitIfCloseEnough: function () {
        var dx = this.x + this.width/2 - exits[this.controlNumber].x;
        var dy = this.y + this.height / 2 - exits[this.controlNumber].y;
        if (dx * dx + dy * dy <= EXIT_RADIUS_SQUARED) {
            this.state = FALLING;
            this.stateTicks = FALL_TICKS;
            this.animateStartPoint = { x: this.center.x, y: this.center.y };
            this.animateEndPoint = {
                x: exits[this.controlNumber].x,
                y: exits[this.controlNumber].y
            }
            this.exitPoint = null;
            playParkSound();
        }
    },

    fallIntoHole: function (hole, proposedCircle) {
        var holeCenterX = hole.x + hole.width / 2;
        var holeCenterY = hole.y + hole.height / 2;
        var dxEntryHole = this.center.x - holeCenterX;
        var dyEntryHole = this.center.y - holeCenterY;
        var exitHole = randomHoleOtherThan(hole);

        this.state = FALLING;
        this.stateTicks = FALL_TICKS;
        this.animateStartPoint = { x: this.center.x, y: this.center.y };
        this.animateEndPoint = { x: holeCenterX, y: holeCenterY };
        this.appearPoint = {
            x: exitHole.x + hole.width / 2,
            y: exitHole.y + hole.height / 2
        }
        this.exitPoint = {
            x: exitHole.x + hole.width / 2 - dxEntryHole,
            y: exitHole.y + hole.height / 2 - dyEntryHole
        }
    },

    moveFallingOrRising: function () {
        this.stateTicks = this.stateTicks + (this.state == FALLING ? -1 : 1);
        var percentComplete = (this.state == FALLING) ? (FALL_TICKS - this.stateTicks) / FALL_TICKS : this.stateTicks / FALL_TICKS;
        var dx = this.animateEndPoint.x - this.animateStartPoint.x;
        var dy = this.animateEndPoint.y - this.animateStartPoint.y;

        this.moveCenterTo(this.animateStartPoint.x + dx * percentComplete, this.animateStartPoint.y + dy * percentComplete);
        //var scaledWidth = GLORP_WIDTH * this.stateTicks / FALL_TICKS;
        //var scaledHeight = GLORP_HEIGHT * this.stateTicks / FALL_TICKS;
        //this.moveCornerTo(this.shrinkCenter.x - scaledWidth / 2, shrinkCenter.y - scaledHeight / 2);

        if ((this.state == FALLING) && !this.stateTicks) {
            return this.finishedFalling();
        }

        if ((this.state == RISING) && (this.stateTicks >= FALL_TICKS)) {
            return this.finishedRising();
        }

        return true;
    },

    finishedFalling: function () {
        if (this.exitPoint) {
            this.state = RISING;
            this.animateStartPoint = this.appearPoint;
            this.animateEndPoint = this.exitPoint;
            this.exitPoint = null;
            this.appearPoint = null;
            return true;
        }

        numberParked++;
        updateScore();
        return false; // this glorp has fallen out of view, remove it from the sprite list
    },

    finishedRising: function () {
        this.state = NORMAL;
        this.animateStartPoint = null;
        this.animateEndPoint = null;
        return true;
    }
}

function findItemOverlappingCircle(itemList, circle) {
    return itemList && itemList.find(function (item) {
        return circleIntersectsRect(circle, item);
    });
}

function findItemOverlappingPoint(itemList, point) {
    return itemList && itemList.find(function (item) {
        return pointInRect(point, item);
    });
}

function randomHoleOtherThan(hole) {
    var exitHole;
    do {
        exitHole = holes[randomInt(holes.length)];
    } while (exitHole == hole);
    return exitHole;
}

var Bullet = {
    x: 0, // NOTE: Bullet x,y are center, not corner!  This is subject to change.
    y: 0,
    radius: BULLET_RADIUS,
    angle: 0, // actually angle of travel
    init: function (x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
    },
    move: function () {
        var rotate = this.angle - 90; // 0 is right, but sprites were drawn pointing up, not right
        this.x += BULLET_SPEED * Math.cos(rotate * Math.PI / 180);
        this.y += BULLET_SPEED * Math.sin(rotate * Math.PI / 180);
        var bullet = this; // 'this' in anonymous function is wrong, it equals window!!!
        return inBounds(this.x, this.y) && !shootable.some(function (shootable) {
            return shootable.checkBullet(bullet);
        });
    },
    render: function () {
        drawCircle(drawingSurface, this.x, this.y, this.radius, null, "red");
    }

}

var Wall = {
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    init: function (x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    },
    destroy: function () {
        walls.splice(walls.indexOf(this), 1);
    },
    move: function () { return true; },
    render: function () {
        drawingSurface.drawImage(
            this.image,
            0, 0,
            this.width, this.height,
  		    this.x, this.y,
            this.width, this.height
        );
        drawRect(drawingSurface, this.x, this.y, this.width, this.height, "black", null);
    }
}

var Hole = {
    x: 0,
    y: 0,
    width: HOLE_WIDTH,
    height: HOLE_HEIGHT,
    init: function (x, y) {
        this.x = x;
        this.y = y;
    },
    move: function () { return true; },
    render: function () {
        drawingSurface.drawImage(
            this.image,
            0, 0,
            this.width, this.height,
  		    this.x, this.y,
            this.width, this.height
        );
    }
}

var Dropper = {
    x: 0,
    y: 0,
    width: DROPPER_WIDTH,
    height: DROPPER_HEIGHT,
    dx: 0,
    deathTicks: 0,
    init: function () {
        this.dx = (Math.random() < 0.5) ? DROPPER_SPEED : -DROPPER_SPEED;
        this.x = (this.dx > 0) ? -DROPPER_WIDTH : GAME_WIDTH;
        this.y = randomInt(GAME_HEIGHT - 160 - exitImage.height - this.height) + exitImage.height + 60;
    },
    move: function () {
        if (this.deathTicks) {
            this.deathTicks++;
            return (this.deathTicks < DROPPER_DEATH_TICKS);
        }
        if (Math.random() < DROP_CHANCE_PER_TICK) {
            this.tryToDropWall();
        }
        this.x += this.dx;
        var onScreen = (this.x + this.width >= 0) && (this.x <= GAME_WIDTH);
        return onScreen;
        //TODO: drop walls!
    },
    render: function () {
        drawingSurface.globalAlpha = 1 - (this.deathTicks / DROPPER_DEATH_TICKS);
        drawingSurface.drawImage(
            this.image,
            0, 0,
            this.width, this.height,
  		    this.x, this.y,
            this.width, this.height
        );
        drawingSurface.globalAlpha = 1;
    },
    destroy: function () {
        shootable.splice(shootable.indexOf(this), 1);
    },
    tryToDropWall: function () {
        var wallSize = DROP_WALL_SIZES[randomInt(DROP_WALL_SIZES.length)];
        var wallRect = { x: this.x + this.width / 2 - wallSize[0] / 2, y: this.y + this.height / 2 - wallSize[1] / 2, width: wallSize[0], height: wallSize[1] };
        if ((wallRect.x > GAME_WIDTH) || (wallRect.x + wallRect.width < 0)) {
            return;
        }

        // Don't allow walls close to holes, because a glorp could emerge from hole overlapping wall
        var holeExclusionZone = {
            x: wallRect.x - GLORP_WIDTH, y: wallRect.y - GLORP_HEIGHT,
            width: wallRect.width + GLORP_WIDTH * 2, height: wallRect.height + GLORP_HEIGHT * 2
        };
        if (findHoleOverlapping(holeExclusionZone)) {
            return;
        }
        createWall(wallRect);

        glorps.forEach(function (glorp) {
            if (glorp.overlapsRect(wallRect)) {
                glorp.state = DEAD;
                sounds[SPLAT_SOUND].play();
            }
        });
    },
    checkBullet: function (bullet) {
        if (circleIntersectsRect(bullet, this)) {
            this.deathTicks = 1;
            //TODO Play sound
            return true;
        }
        return false;
    }
};

function findHoleOverlapping(rect) {
    return holes.find( function (hole) {
        return rectIntersectRect(hole, rect);
    });
}

function findGlorpOverlapping(rect) {
    return glorps.find(function (glorp) {
        return glorp.overlapsRect(rect);
    });
}

function hitWall() {
    playBumpSound();
    bump_tick = BUMP_TICKS;
}

function inBounds(x, y) {
    return ((x >= 0) && (x < GAME_WIDTH) && (y >= 0) && (y < GAME_HEIGHT));
}

function pointInRect(point, rect) {
    return ((point.x >= rect.x) && (point.x < rect.x + rect.width) && (point.y >= rect.y) && (point.y < rect.y + rect.height));
}

function initLevel(level, button) {
    $("#startScreen").hide();
    $("#mainScreen").show();
    $("#levelStart").show();
    $("#levelText").text(level.text);
    $("#levelStart .levelButton").show().text("Start");
    pressEnterClicksButton($("#levelStart .levelButton"));
    currentLevelButton = button;
    numberParked = 0;
    sprites = [];
    shootable = [];

    initWalls(level.walls);
    initHoles(level.holes);
    initGlorps(level.glorps); // Do this last so glorps will be drawn on top of other things
    ticksUntilNextDropper = (level.droppers ? 0 : Infinity);

    paused = true;
    updateScore();
    update();
}

function initGlorps(numberOfGlorps) {
    numberOfGlorps = numberOfGlorps || 5;
    glorps = [];
    for (var i = 1; i <= numberOfGlorps; i++) {
        var car = Object.create(Glorp);
        var carX = (GAME_WIDTH / 10) - (GLORP_WIDTH / 2) + (GAME_WIDTH / 5) * (i - 1);
        car.init(i, carX, GLORP_START_Y);
        sprites.push(car);
        glorps[i] = car;
    }
}

function initWalls(levelWalls) {
    walls = [];
    if (!levelWalls) {
        return;
    }

    levelWalls.forEach(function (wallData) {
        createWall(wallData[0], wallData[1], wallData[2], wallData[3]);
    });
}

function createWall(xOrRect, y, width, height) {
    var wall = Object.create(Wall);
    if (typeof xOrRect == "object") {
        wall.init(xOrRect.x, xOrRect.y, xOrRect.width, xOrRect.height);
    } else {
        wall.init(xOrRect, y, width, height);
    }
    walls.push(wall);
    sprites.push(wall);
}

function initHoles(levelHoles) {
    holes = [];
    if (!levelHoles) {
        return;
    }
    if (levelHoles.length == 1) {
        console.log("LEVEL DATA ERROR - Can't have just one hole!");
        return;
    }

    levelHoles.forEach(function (holeLocation) {
        var hole = Object.create(Hole);
        hole.init(holeLocation[0], holeLocation[1]);
        holes.push(hole);
        sprites.push(hole);
    });
}

function endLevel() {
    removeEventHandlers();
    $("#levelEnd").show();
    pressEnterClicksButton($("#levelEnd .levelButton"));
    currentLevelButton.addClass("finished");
}

function restartLevel() {
    currentLevelButton.click();
}

function startGame() {
    $("#levelStart").hide();
    paused = false;
    setUpEventHandlers();
    update();
}

function togglePause() {
    paused = !paused;
    if (paused) {
        $("#levelStart").show();
        $("#levelStart .levelButton").text("Continue");
    } else {
        $("#levelStart").hide();
        update();
    }
}

function returnToStartScreen() {
    removeEventHandlers();
    $("#levelEnd").hide();
    $("#mainScreen").hide();
    $("#startScreen").show();
}

function renderBackground() {
    var color;
    if (bump_tick > 0) {
        bump_tick -= 1;
        color = "yellow";
    } else {
        color = "white";
    }
    drawRect(drawingSurface, 0, 0, GAME_WIDTH, GAME_HEIGHT, "black", color);
    renderExitStrip();
}

function renderExitStrip(numerClosed) {
    drawingSurface.drawImage(exitImage, 0, 0);
    for (var i = glorps.length; i < exits.length; i++) {
        drawingSurface.drawImage(
                Glorp.image,
                0, GLORP_HEIGHT * 3,
                GLORP_WIDTH, GLORP_HEIGHT,
                exits[i].x - GLORP_WIDTH / 2, exits[i].y - GLORP_HEIGHT / 2,
                GLORP_WIDTH, GLORP_HEIGHT
            );
    }
}

function updateScore() {
    $(".score").text(numberParked);
}

function checkForEnemies() {
    $("#debug").text(ticksUntilNextDropper);
    if (ticksUntilNextDropper-- <= 0) {
        var dropper = Object.create(Dropper);
        dropper.init();
        shootable.push(dropper);
        sprites.push(dropper);
        //ticksUntilNextDropper = (randomInt(11) + 5) * 60;
        ticksUntilNextDropper = TICKS_BETWEEN_DROPPERS;
    }
}

function update() {
    if (!document.hasFocus()) {
        keysDown = {};
    }
    renderBackground();

    checkForEnemies();
    for (var i = sprites.length - 1; i >= 0; i--) {
        //WARNING: move may add new sprites to the list, so using sprites.filter instead of loop here does not work!!
        var sprite = sprites[i];
        if (!sprite.move()) {
            if (sprite.destroy) {
                sprite.destroy();
            }
            sprites.splice(i, 1);
        }
    };
    sprites.forEach(function (sprite) { sprite.render(); });

    if (numberParked < glorps.length - 1) {
        if (!paused) {
            requestAnimFrame(update);
        }
    } else {
        endLevel(true);
    }
}

function playParkSound() {
    soundEffect(
		16, //frequency 
		0, //attack 
		0.5, //decay 
		'sawtooth', //waveform 
		1, //volume 
		0, //pan 
		0, //wait before playing 
		0, //pitch bend amount 
		false, //reverse 
		0, //random pitch range 
		50, //dissonance 
		undefined, //echo: [delay, feedback, filter] 
		undefined //reverb: [duration, decay, reverse?] 
	);
}

function playBumpSound() {
    soundEffect(
		900, //frequency 
		0, //attack 
		0.2, //decay 
		'square', //waveform 
		0.5, //volume 
		0, //pan 
		0, //wait before playing 
		0, //pitch bend amount 
		false, //reverse 
		0, //random pitch range 
		10, //dissonance 
		undefined, //echo: [delay, feedback, filter] 
		undefined //reverb: [duration, decay, reverse?] 
	);
}