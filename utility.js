window.requestAnimFrame = (function () {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

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

function drawCircle(ctx, x, y, radius, borderColor, fillColor) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, false);
    if (fillColor != null) {
        ctx.fillStyle = fillColor;
        ctx.fill();
    }
    if (borderColor != null) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = borderColor;
        ctx.stroke();
    }
    ctx.closePath();
}

function clamp(value, min, max) {
    return (value <= min) ? min : ( (value >= max) ? max : value) ;
}

function circleIntersectsRect(circle, rect) {
    // Find the closest point to the circle within the rectangle
    var closestX = clamp(circle.x, rect.x, rect.x + rect.width);
    var closestY = clamp(circle.y, rect.y, rect.y + rect.height);

    // Calculate the distance between the circle's center and this closest point
    var distanceX = circle.x - closestX;
    var distanceY = circle.y - closestY;

    // If the distance is less than the circle's radius, an intersection occurs
    var distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
    return distanceSquared < (circle.radius * circle.radius);
}

function rectIntersectsRect(r1, r2) {
    return !(r2.x > r1.x + r1.width || 
             r2.x + r2.width < r1.x || 
             r2.y > r1.y + r2.height ||
             r2.y + r2.height < r1.y);
}

function randomInt(max) {
    return Math.floor(Math.random() * max);
}