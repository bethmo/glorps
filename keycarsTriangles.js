// keycars.js

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

// use this instead of $(document).ready unless I want other Jquery as well
$(document).ready( function () {
    setUpCanvas();
    setUpEventHandlers();
    loadImages();
    initLevel();
});

function whenAllResourcesHaveLoaded() {
    update();
}

const GAME_WIDTH = 700;
const GAME_HEIGHT = 700;
const BASE_SPEED = 5;
const ROTATION_SPEED = 6;

const CAR_IMAGE_FILE = "allCars.png";
const CAR_WIDTH = 70;
const CAR_HEIGHT = 100;

var resourcesNeeded = 0;
var resourcesLoaded = 0;
var carSheet;
var drawingSurface;
var keysDown = {}; // map keycode to true or false
var selectedCarNumber = 3;
var sprites = [];

function setUpCanvas() {
    var canvas = document.getElementById('myCanvas');
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    drawingSurface = canvas.getContext('2d');

    drawingSurface.font = "30px Arial";
    drawingSurface.textAlign = "center";
    drawingSurface.fillText("Loading, please wait...", canvas.width / 2, canvas.height / 2);

}

function setUpEventHandlers() {
    $(document).keydown(keyDownHandler);
    $(document).keyup(keyUpHandler);
}


function keyDownHandler() {
    keysDown[event.keyCode] = true;
    // Add code here for things that trigger on keypress
    if ((event.keyCode >= KEY_ONE) && (event.keyCode < KEY_ONE + 5)) {
        selectedCarNumber = event.keyCode - KEY_ONE + 1;
    }
    //switch (event.keyCode) {
    //    case ESC:
    //        togglePause();
    //        break;
    //    case SPACEBAR:
    //        shoot();
    //        break;
    //}
}

function keyUpHandler() {
    keysDown[event.keyCode] = false;
}

function loadImages() {
    carSheet = startLoadingImage(CAR_IMAGE_FILE);
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


var tempCar = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    width: CAR_WIDTH,
    height: CAR_HEIGHT,
    rotation: 0,
    image: null,
    controlNumber: 0,
    sourceX: 0,
    sourceY: 0,
    ticks: 0,
    init: function (source, number, x, y) {
        this.image = source;
        this.controlNumber = number;
        this.sourceX = (number - 1) * CAR_WIDTH;
        this.sourceY = 0;
        this.x = x;
        this.y = y;
    },
    move: function () {
        if (selectedCarNumber != this.controlNumber) {
            return;
        }
        var speed = BASE_SPEED;
        if (keysDown[LEFT_ARROW]) {
            this.rotation = (this.rotation - ROTATION_SPEED) % 360;
        }
        if (keysDown[RIGHT_ARROW]) {
            this.rotation = (this.rotation + ROTATION_SPEED) % 360;
        }
        if (keysDown[UP_ARROW]) {
            var rotate = this.rotation - 90; // 0 is right, but sprites were drawn pointing up, not right
            this.x += speed * Math.cos(rotate * Math.PI / 180);
            this.y += speed * Math.sin(rotate * Math.PI / 180);
        }
        if (this.y < 0) { this.y = GAME_HEIGHT - this.y; }
    },
    render: function () {
        //Save the current state of the drawing surface before it's rotated
        drawingSurface.save();

        drawingSurface.globalAlpha = (selectedCarNumber == this.controlNumber ? 1 : 0.3);

        //Rotate the canvas
        drawingSurface.translate
  	    (
  	      Math.floor(this.x + (this.width / 2)),
  	      Math.floor(this.y + (this.height / 2))
  	    );

        drawingSurface.rotate(this.rotation * Math.PI / 180);

        drawingSurface.drawImage(
            this.image,
            this.sourceX, this.sourceY,
            this.width, this.height,
  		    Math.floor(-this.width / 2), Math.floor(-this.height / 2),
            this.width, this.height
        );

        //Restore the drawing surface to its state before it was rotated
        drawingSurface.restore();
    }
}

function initLevel() {
    sprites = [];
    var carY = GAME_HEIGHT - CAR_HEIGHT - 10;
    for (var i = 1; i <= 5; i++) {
        var car = Object.create(tempCar);
        var carX = (GAME_WIDTH / 10) - (CAR_WIDTH / 2) + (GAME_WIDTH / 5) * (i - 1);
        car.init(carSheet, i, carX, carY);
        sprites.push(car);
    }
}

function renderBackground() {
    drawRect(drawingSurface, 0, 0, GAME_WIDTH, GAME_HEIGHT, "black", "white");
}

function update() {
    renderBackground();
    for (var i = 0; i < sprites.length; i++) {
        sprites[i].move();
    }

    for (var i = 0; i < sprites.length; i++) {
        sprites[i].render();
    }

    requestAnimFrame(update);
}


function drawRect(ctx, left, top, width, height, borderColor, fillColor) {
    ctx.beginPath();
    ctx.rect(left, top, width, height);
    if (fillColor != null) {
        ctx.fillStyle = fillColor;
        ctx.fill();
    }
    if (borderColor != null) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = borderColor;
        ctx.stroke();
    }
}
