
const ONE_GLORP_LEVEL = {
    name: "Start",
    text: "Steer the Glorp to hole #1!  Use the left and right arrow to turn, up arrow to move.",
    glorps: 1,
    walls: [
        [200, 200, 100, 100]
    ]
};

const FOUR_WALL_LEVEL = {
    text: "Now you have five Glorps to deal with! The number keys change which Glorp you're controlling.  Each one only fits into the hole with the matching number.",
    glorps: 5,
    walls: [
        [150, 200, 200, 20],
        [550, 200, 200, 20],
        [350, 300, 200, 20],
        [450, 200, 20, 100],
    ]
};

const HOLE_LEVEL = {
    name: "Holes",
    text: "Let's experiment with holes",
    glorps: 1,
    holes: [
        [200, 200],
        [500, 200],
        [300, 400],
    ]
};

const DROPPER_LEVEL = {
    name: "Dropper",
    text: "Watch out for the Walldropper!",
    glorps: 5,
    droppers: true,
    holes: [
        [300, 400]
    ]
};

const levels = [
    ONE_GLORP_LEVEL,
    FOUR_WALL_LEVEL,
    HOLE_LEVEL,
    DROPPER_LEVEL
];
