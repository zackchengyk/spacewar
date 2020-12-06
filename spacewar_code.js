/* Spacewar! - Zack */

/* This is a JS (Javascript) file, which does the bulk of the computational and
   graphical grunt work which makes the HTML document interactive. If you're
   also looking at the HTML file, pay attention to the "canvas" element, that's
   where all the magic happens!

   If you're not familiar with code, basically anything with brackets like this:
       draw()
   or this:
       generateBoom(frameArray, x, y, bigBoomCount, bigBoomRadius, 0)
   is a function call. It tells the computer to do some computations based on
   the inputs in the brackets (if any). What those computations are depends on
   what you defined the function to be in a separate section of the code.

   The whole program starts when draw() is called. That function runs once
   every frame to do the math, update your position, check collisions, draw the
   rockets and trails, etc.

   If you're interested in the mathematical bits, an important note is that in
   order to accommodate different screen sizes (go on, try resizing your browser
   window), I did everything in units of "pc", defined as 1/1000th of the square
   canvas' width/height.

   Also, if you like, skim through the comments (text after double-slashes)! I
   spent A LOT of time on that to make it as clear as I can!
   */


// #############################################################################
// ############################       MODIFIERS       ################### 1 of 3
// #############################################################################

// Hello! Honestly since you're not going to read thousands of lines of code on
// your random built-into-your-computer text editor, which doesn't color-code
// stuff, just read this section (Modifiers, up to just before Global Variables)

// These are easy to change; set them anywhere from 0 to 4 for best results
// If you want, you can go ahead and change literally anything in this code, but
// it *might* break the game -- I think you'll be fine if you change only
// innocent-looking variables like fps or projCollisionRange though

let scaleAcc      = 1; // thruster acceleration of the rockets
let scaleRot      = 1; // rotation speed of the rockets
let scaleGrav     = 1; // strength of gravity (0 for stress-free experience)
let scalePewSpeed = 1; // torpedo speed (too high, and hit-detection might fail)
let scalePewLife  = 1; // torpedo lifetime
let scalePewDelay = 1; // the "reload" time of torpedoes (try reducing this!)
let scaleTrail    = 1; // trail length (might slow the game (i.e. cause lag))
let scalePause    = 1; // duration between ship destruction and reset
let scaleShip     = 1; // dimensions of ships

// Even easier modifiers: change any number of these between "false" and "true"
let make_this_faster_and_less_historically_accurate = false;
let do_a_projectile_physics_demonstration = false;        // These two conflict
let start_with_projectiles_all_over_the_place = false;    // These two conflict
let make_things_bigger = false;
let truly_random_starting_positions = false;    // These two also conflict
let fly_me_to_the_sun = false;                  // These two also conflict

// Some modifications are done here, others are done much later in the code
if (make_this_faster_and_less_historically_accurate) {
    scaleAcc = 5;
    scaleRot = 2;
    scaleGrav = 2;
    scalePewSpeed = 2;
    scalePause = 0.5;
}
if (make_things_bigger) {
    scaleAcc = Math.min(3, scaleAcc);
    scalePewSpeed = Math.min(2, scalePewSpeed);
    scaleShip = 2 * scaleShip;
}


// #############################################################################
// ############################   GLOBAL  VARIABLES   ################### 2 of 3
// #############################################################################


// Global variables are essentially things like numbers, arrays, lists, etc that
// can be accessed by everyone else in the code. You'll see that it stores
// important constants, like gravity, as well as objects (groups of data) which
// represent, say, the wedge-shaped rocket, or its trails

// Simulation-related Constants (Time and Space)
let fps = 20;                               // frames per second
let actualToFakeDim = 2;                    // ratio of actual and fake dim.
let actualDim = 0;                          // actual height / width of canvas
let fakeDim = actualDim * actualToFakeDim;  // the canvas "resolution"
let pc = fakeDim / 1000;                    // 1 pc is 1/1000th of the canvas

// Simulation-related Constants (Ship Maneuverability)
let acc = 6 / fps / fps * scaleAcc;         // acceleration, in pc per sec^2
let rotSpeed = 1.5 / fps * scaleRot;        // rotation speed, in rad per sec

// Simulation-related Constants (Torpedo Firing)
let pewSpeed = 60 / fps * scalePewSpeed;    // shot speed, in pc per frame
let lifetimeOfPew = 4000 * scalePewLife;    // how long a shot lasts, in ms
let delayBetweenPews = 750 * scalePewDelay; // delay between shots
let pewOffset = 10;                          // shot origin, in front of ship
let projCollisionRange = 15;                // critical distance for
                                            // projectile-projectile collisions

// Simulation-related Constants (Physics)
let gravityFactor = 700000 / fps / fps * scaleGrav;
                                            // gravity strength, units unknown

// Rendering-related Constants
let trailFrames = Math.floor(fps * 20 * scaleTrail);
                                            // trail length, in frames
let lineThickness = scaleShip ** 2;         // line thickness for ship, in pc
let dotThickness = lineThickness + 2;       // line "thickness" for dots, in pc
let boomRadius = 40;                        // torpedo explosion radius
let bigBoomRadius = 160 * scaleShip;        // ship explosion radius
let boomCount = 10;                         // torpedo explosion particle-count
let bigBoomCount = 100 * scaleShip;         // ship explosion particle-count
let iR = 201, iG = 238, iB = 300;           // initial RGB of trail
let fR = 135, fG = 166, fB = 120;           // final RGB of trail
let pauseFrames = Math.floor(3 * fps * scalePause);
                                            // pause for game reset, in frames
let epsH = 0 * scaleShip;                   // buffer for bigger hitboxes
let epsW = 5 * scaleShip;                   // buffer for bigger hitboxes
let arbitraryEpsilon = 400 * scaleShip;     // some arbitrary hitbox buffer
let minSunLength = 15, maxSunLength = 60;   // min and max sizes of sun, in pc
let starCount = 40, starJitter = 0;         // number of stars and their jitter

// Things That Might Change
let wedge = {                               // represents a wedge rocket
    w: 8.4 * scaleShip,  // in pc, half of the port-to-starboard ship width
    h: 20.4 * scaleShip, // in pc, half of the bow-to-stern ship length
    x: 200,            // in pc, horizontal displacement from top left
    y: 800,            // in pc, vertical displacement from top left
    ang: -Math.PI/2,   // in rad, in clockwise direction, angle of ship
    vx: 0,             // in pc per sec, horizontal velocity (right is positive)
    vy: 0,             // in pc per sec, vertical velocity (down is positive)
    pewOff: false,     // boolean to indicate if weapon currently "cooling down"
    isAcc: 0,          // in pc, current length of exhaust trail; positive means
                       // accelerating, zero means not accelerating
};
let needle = {                              // represents a needle rocket
    w: 8.4 * scaleShip,  // in pc, half of the port-to-starboard ship width
    h: 20.4 * scaleShip, // in pc, half of the bow-to-stern ship length
    x: 800,            // in pc, horizontal displacement from top left
    y: 200,            // in pc, vertical displacement from top left
    ang: Math.PI/2,   // in rad, in clockwise direction, angle of ship
    vx: 0,             // in pc per sec, horizontal velocity (right is positive)
    vy: 0,             // in pc per sec, vertical velocity (down is positive)
    pewOff: false,     // boolean to indicate if weapon currently "cooling down"
    isAcc: 0,          // in pc, current length of exhaust trail; positive means
                       // accelerating, zero means not accelerating
};
let projectiles = [];                       // projectile format: [x,y,vx,vy,?]
let projId = 0;                             // unique ID for each projectile
let wedgeTrails = {                         // represents wedge rocket's trail
    arr: Array(trailFrames), // e.g.: [undef, (nextI) undef, 3rd, 2nd, 1st]
    nextI: trailFrames - 1,  // pointer to the next spot to be filled (oldest)
    myPush: function (x, y, ang, isAcc) {
        // this function puts a new "shadow" copy on the array, overwriting
        // the oldest "shadow" in the trail, and changing the pointer. Each
        // "shadow" is defined by its position, angle, and exhaust length
        this.arr[this.nextI] = {x: x, y: y, ang: ang, isAcc: isAcc};
        this.nextI--;
        if (this.nextI < 0) {
            this.nextI += trailFrames;
        }
    },
    myPushNull: function () {
        // this function puts a null "shadow" copy on the array, same as myPush,
        // this is used when the ship has been destroyed and we're waiting for
        // the game to reset
        this.arr[this.nextI] = null;
        this.nextI--;
        if (this.nextI < 0) {
            this.nextI += trailFrames;
        }
    }
}
let needleTrails = {                        // represents needle rocket's trail
    arr: Array(trailFrames), // e.g.: [undef, (nextI) undef, 3rd, 2nd, 1st]
    nextI: trailFrames - 1,  // pointer to the next spot to be filled (oldest)
    myPush: function (x, y, ang, isAcc) {
        // this function puts a new "shadow" copy on the array, overwriting
        // the oldest "shadow" in the trail, and changing the pointer. Each
        // "shadow" is defined by its position, angle, and exhaust length
        this.arr[this.nextI] = {x: x, y: y, ang: ang, isAcc: isAcc};
        this.nextI--;
        if (this.nextI < 0) {
            this.nextI += trailFrames;
        }
    },
    myPushNull: function () {
        // this function puts a null "shadow" copy on the array, same as myPush,
        // this is used when the ship has been destroyed and we're waiting for
        // the game to reset
        this.arr[this.nextI] = null;
        this.nextI--;
        if (this.nextI < 0) {
            this.nextI += trailFrames;
        }
    }
}
let projectileTrails = {                    // represents projectiles' trails
    arr: Array(trailFrames), // e.g.: [undef, (nextI) undef, 3rd, 2nd, 1st]
    nextI: trailFrames - 1,  // pointer to the next spot to be filled (oldest)
    myCreateFrame: function () {
        // different than with rockets; each frame may have more than one
        // projectile and thus instead of a single element per frame, we have an
        // array of "shadow" projectile elements per frame. Each projectile is
        // defined by its position only
        this.indexOfLastFilledFrame = this.nextI;
        this.arr[this.indexOfLastFilledFrame] = [];
        this.nextI--;
        if (this.nextI < 0) {
            this.nextI += trailFrames;
        }
        // returns the index (in arr) of the last-created array of "shadow"
        // projectile elements, for easy access
        return this.indexOfLastFilledFrame;
    },
    indexOfLastFilledFrame: undefined, // the index of the newest array in arr
}
let sunTrails = {
    arr: Array(trailFrames), // e.g.: [undef, (nextI) undef, 3rd, 2nd, 1st]
    nextI: trailFrames - 1,  // pointer to the next spot to be filled (oldest)
    myPush: function (ang, len) {
        // this function puts a new "shadow" of the sun's flare line on the
        // array, overwriting the oldest one, and changing the pointer. Each
        // "shadow" is defined by its angle and length only.
        this.arr[this.nextI] = {ang: ang, len: len};
        this.nextI--;
        if (this.nextI < 0) {
            this.nextI += trailFrames;
        }
    },
}
let mouseTrails = {                         // represents your cursor's trail
    mouseX: 0,
    mouseY: 0,
    arr: Array(trailFrames), // e.g.: [undef, (nextI) undef, 3rd, 2nd, 1st]
    nextI: trailFrames - 1,  // pointer to the next spot to be filled (oldest)
    myPush: function (x, y) {
        // this function puts a new "shadow" copy on the array, overwriting
        // the oldest "shadow" in the trail, and changing the pointer. Each
        // "shadow" is defined by its position only.
        this.arr[this.nextI] = {x: x, y: y};
        this.nextI--;
        if (this.nextI < 0) {
            this.nextI += trailFrames;
        }
    },
    myPushNull: function () {
        // this function puts a null "shadow" copy on the array, same as myPush,
        // this is used when the mouse is not on the canvas
        this.arr[this.nextI] = null;
        this.nextI--;
        if (this.nextI < 0) {
            this.nextI += trailFrames;
        }
    }
}
let lightPenModeIsOn = false;
let stars = [];                             // keeps track of star positions
initializeStars();                          // function sets up stars
let gameIsPausedForThisManyFrames = 0;      // tracks remaining pause frames
let playerWon = 0;                          // 0 none; 1 wedge; 2 needle; 3 draw
let continueBoomWedge = null;               // tracks continuation of explosion
let continueBoomNeedle = null;              // tracks continuation of explosion

// Implement modifications
if (fly_me_to_the_sun) {
    wedge.x = 450;
    wedge.y = 550;
    needle.x = 550;
    needle.y = 450;
} else if (truly_random_starting_positions) {
    wedge.x = Math.random() * 1000;
    wedge.y = Math.random() * 1000;
    needle.x = Math.random() * 1000;
    needle.y = Math.random() * 1000;
}
if (do_a_projectile_physics_demonstration) {
    projectiles = [[100,200,pewSpeed,0,1],
        [300,400,0,-pewSpeed,1],
        [500,200,-pewSpeed,0,1],
        [700,400,0,pewSpeed,1],
        [710,900,0,-pewSpeed,1],
        [750,400,0,pewSpeed,1],
        [770,900,0,-pewSpeed,1],
        [500,650,-pewSpeed,0,1],
        [950,650,-2*pewSpeed,0,1]];
    projId = projectiles.length + 1;
} else if (start_with_projectiles_all_over_the_place) {
    for (let i = 0; i < 40; i++) {
        let angle = Math.random() * 2 * Math.PI;
        projectiles.push([Math.random() * 1000,
                          Math.random() * 1000,
                          Math.cos(angle) * pewSpeed * 0.75,
                          Math.sin(angle) * pewSpeed * 0.75,
                          1]);
    }
    projId = projectiles.length + 1;
}
if (make_things_bigger) {
    minSunLength = 2 * minSunLength;
    maxSunLength = 2 * maxSunLength;
    projCollisionRange = 2 * projCollisionRange;
}


// Make backup copies for later use (resetting)
let wedgeBackupCopy = deepCopy(wedge);      // backup copy of wedge
let needleBackupCopy = deepCopy(needle);    // backup copy of needle

// Controllers
let controller = {                          // tracks buttons currently pressed
    w: {
        pressed: false,
        func: () => {tryToPew(1)},
    },
    a: {
        pressed: false,
        func: () => {wedge.ang -= rotSpeed},
    },
    s: {
        pressed: false,
        func: () => {
            // Generates a random number from 0.5h to 2h
            // Any non-zero number means it is accelerating
            // This length is purely for display stuff
            wedge.isAcc = wedge.h * (0.5 + (1.5 * Math.random()));
        },
    },
    d: {
        pressed: false,
        func: () => {wedge.ang += rotSpeed},
    },

    i: {
        pressed: false,
        func: () => {tryToPew(0)},
    },
    j: {
        pressed: false,
        func: () => {needle.ang -= rotSpeed},
    },
    k: {
        pressed: false,
        func: () => {
            // Generates a random number from 0.5h to 2h
            // Any non-zero number means it is accelerating
            // The length is purely for display stuff
            needle.isAcc = needle.h * (0.5 + (1.5 * Math.random()));
        },
    },
    l: {
        pressed: false,
        func: () => {needle.ang += rotSpeed},
    },
}
window.addEventListener("keydown", function (e) {
    if (controller[e.key]) {
        e.preventDefault();
        controller[e.key].pressed = true;
    } else if (e.key === " ") {
        // After the first time pressing space, actualDim will never be zero as
        // long as there is a canvas element (aka user did not delete it)
        if (!actualDim && document.getElementById("pdpCanvas")) {
            let x = document.getElementById("canvasMessageContainer");
            x.className += " deactivated";
            setTimeout(() => {
                draw();
                myGameArea.canvas.style.cursor = "pointer";
                myGameArea.canvas.addEventListener("click", switchLightPenModeOnClick);
            }, 1500);
        }
    }
})
window.addEventListener("keyup", function (e) {
    if (controller[e.key]) {
        e.preventDefault();
        controller[e.key].pressed = false;
    }
})

// The myGameArea object
let ctx, myGameArea = {
    canvas: document.getElementById("pdpCanvas"),
    setupForNewSizeIfAny: function () {
        if (actualDim !== this.canvas.offsetHeight) {
            actualDim = this.canvas.offsetHeight;
            fakeDim = actualDim * actualToFakeDim;
            pc = fakeDim / 1000;
            this.canvas.height = fakeDim;
            this.canvas.width = fakeDim;
            this.context = this.canvas.getContext("2d");
            ctx = this.context;
        }
    },
    deleteCanvasDrawings: function () {
        ctx.clearRect(0, 0, fakeDim, fakeDim);
    }
}


// #############################################################################
// ############################       FUNCTIONS       ################### 3 of 3
// #############################################################################


// These functions are all important "sequences of instructions" which your
// browser will execute, when the functions are called.

// On page load

let text = document.querySelectorAll("p.canvasMessage.small, p.canvasMessage.medium");
let t = 0;
let typeDelay = 1;

sequentialTypewriter();

function sequentialTypewriter() {
    if (text[t]) {
        let ele = text[t];
        console.log(ele.innerText);
        let l = ele.innerText.length;
        ele.style.opacity = "1";
        ele.style.animation = "typing " + typeDelay + "s steps( 71, end)";
        t++;
        setTimeout(sequentialTypewriter, (l / 71 * typeDelay * 1000));
    }
}

// Every frame

function draw() {
    // Each call to this function represents one frame; in fact, you might find
    // that if your computer is really slow and this function takes too long,
    // your frames-per-second would actually be less than expected!

    // Just in case the screen size changed, prepare the canvas for a new size
    myGameArea.setupForNewSizeIfAny();

    // Clear everything in the canvas
    myGameArea.deleteCanvasDrawings();

    // Do things based on which buttons are currently pressed (see "controller")
    executeMoves();

    // Change the positions of the rockets, based on acceleration and velocity
    // This might set the position to null, if the ship was already destroyed
    changeRocketPositions();

    // Change the positions of the rockets, based ONLY on velocity, as per the
    // original Spacewar!. This might delete projectiles that have "timed out".
    changeProjectilePositions();

    // If we're currently paused, we decrease the "remaining frames" counter,
    // and if we're on the last frame, we set a variable to "true" for later use
    let weAreOnTheLastFrameOfPause = false;
    if (gameIsPausedForThisManyFrames > 1) {
        gameIsPausedForThisManyFrames--;
    } else if (gameIsPausedForThisManyFrames === 1) {
        weAreOnTheLastFrameOfPause = true;
    }

    // Check for collisions. The function checkCollisions() returns a value from
    // 1-3 which tells us if somebody won; or 0 if nobody has yet.
    let collWinner = checkCollisions();
    if (collWinner > 0) {
        // Collision (1 --> wedge won, 2 --> needle won, 3 --> tie)

        // Add the return-value, collWinner, to playerWon
        playerWon += collWinner;

        // If playerWon was previously 0, it is now equal to collWinner, and
        // that means that one rocket (or both) just got destroyed, so...
        if (playerWon === collWinner) {
            // ...someone just won! (or it was a tie)
            switch (playerWon) {
                case 1: {
                    console.log("%cWedge wins!", "color: yellowgreen");
                    break;
                }
                case 2: {
                    console.log("%cNeedle wins!", "color: yellowgreen");
                    break;
                }
                case 3: {
                    console.log("%cIt's a tie!", "color: yellowgreen");
                    break;
                }
            }
            // Prepare to pause -- this will take effect next time we go through
            // the draw() function
            gameIsPausedForThisManyFrames = pauseFrames;
        } else {
            // If playerWon was not previously 0, it is not going to be equal to
            // collWinner, so that means someone had already won, but then that
            // player just got blown up as well...
            switch (collWinner) {
                case 1: {
                    console.log("%cOops, wedge exploded. " +
                        "Looks like it's a tie instead!", "color: yellowgreen");
                    break;
                }
                case 2: {
                    console.log("%cOops, needle exploded. " +
                        "Looks like it's a tie instead!", "color: yellowgreen");
                    break;
                }
            }
        }
    }

    // Draw things. We've not got a real CRT screen, so I had to create my own
    // trail effect in a very roundabout way, because I was insistent on using
    // only my own pure Javascript, and only HTML's Canvas element.
    drawProjectilesAndTrails();
    drawRocketsAndTrails();
    perFrameAddMousePosition();   // Super irrelevant, for-fun things
    drawMouseTrail();             // Super irrelevant, for-fun things
    drawSun();
    drawStars();
    redrawCurrentProjectilesAndRockets();

    // If there was a previous explosion to continue (since explosions ought to
    // last more than a single frame), draw more particles for that
    if (continueBoomWedge) {
        let frameArray = projectileTrails.arr[projectileTrails.indexOfLastFilledFrame];
        generateBoom(frameArray, ...continueBoomWedge);
        continueBoomWedge[2] = Math.floor(continueBoomWedge[2] / 2);
        continueBoomWedge[3] += bigBoomRadius / 2;
        continueBoomWedge[4] += bigBoomRadius / 2;
        if (continueBoomWedge[2] < bigBoomCount / 8) {
            continueBoomWedge = null;
        }
    }
    if (continueBoomNeedle) {
        let frameArray = projectileTrails.arr[projectileTrails.indexOfLastFilledFrame];
        generateBoom(frameArray, ...continueBoomNeedle);
        continueBoomNeedle[2] = Math.floor(continueBoomNeedle[2] / 2);
        continueBoomNeedle[3] += bigBoomRadius / 2;
        continueBoomNeedle[4] += bigBoomRadius / 2;
        if (continueBoomNeedle[2] < bigBoomCount / 8) {
            continueBoomNeedle = null;
        }
    }

    // If we are on the last frame of a pause, it's time to reset things
    if (weAreOnTheLastFrameOfPause) {
        gameIsPausedForThisManyFrames = 0;
        resetThingsThatChange();
        playerWon = 0;
    }

    // Set a timer for (1000 divided by fps) milliseconds, and call draw() again
    // after that's done
    setTimeout(draw, 1000 / fps);
}

// User Input and Simulation Helper Functions

function executeMoves() {
    // Reset isAcc to 0
    wedge.isAcc = 0;
    needle.isAcc = 0;
    // Run controller functions
    Object.keys(controller).forEach(function (key) {
        controller[key].pressed && controller[key].func();
    });
}

function changeRocketPositions() {
    // Check if player won and change only the winner; just null for the other
    if (playerWon === 0) {
        changeOneRocketsPosition(1);
        changeOneRocketsPosition(0);
    } else if (playerWon === 1) {
        changeOneRocketsPosition(1);
        needleTrails.myPushNull();
    } else if (playerWon === 2) {
        wedgeTrails.myPushNull();
        changeOneRocketsPosition(0);
    } else if (playerWon === 3) {
        wedgeTrails.myPushNull();
        needleTrails.myPushNull();
    }
}

function changeOneRocketsPosition(isWedge) {

    let shipTrails = needleTrails, ship = needle;
    if (isWedge) {
        shipTrails = wedgeTrails;
        ship = wedge;
    }

    // Apply forces on velocities for ship
    if (ship.isAcc !== 0) {
        ship.vx += acc * Math.cos(ship.ang);
        ship.vy += acc * Math.sin(ship.ang);
    }
    let shipDistFromSunCubed = ((ship.x - 500) ** 2 + (ship.y - 500) ** 2) ** 1.5;
    ship.vx -= gravityFactor * (ship.x - 500) / shipDistFromSunCubed;
    ship.vy -= gravityFactor * (ship.y - 500) / shipDistFromSunCubed;

    // Apply velocities on positions for ship
    if ((ship.x += ship.vx) > 1000) {
        ship.x = ship.x % 1000;
    } else if (ship.x < 0) {
        ship.x = ship.x % 1000 + 1000;
    }
    if ((ship.y += ship.vy) > 1000) {
        ship.y = ship.y % 1000;
    } else if (ship.y < 0) {
        ship.y = ship.y % 1000 + 1000;
    }

    // Save ship to trails
    shipTrails.myPush(ship.x, ship.y, ship.ang, ship.isAcc);
}

function changeProjectilePositions() {
    let frameArray = projectileTrails.arr[projectileTrails.myCreateFrame()];
    projectiles.forEach(function (ele, i) {
        if (ele[4]) {
            // Apply velocities on positions
            if ((ele[0] += ele[2]) > 1000) {
                ele[0] = ele[0] % 1000;
            } else if (ele[0] < 0) {
                ele[0] = ele[0] % 1000 + 1000;
            }
            if ((ele[1] += ele[3]) > 1000) {
                ele[1] = ele[1] % 1000;
            } else if (ele[1] < 0) {
                ele[1] = ele[1] % 1000 + 1000;
            }
            // Save projectile to current frameArray
            frameArray.push([ele[0], ele[1]]);
        } else {
            // Generate boom for current frameArray and delete projectile
            generateBoom(frameArray, ele[0], ele[1], boomCount, boomRadius, 0);
            delete projectiles[i];
        }
    });
    // If projectile is near another projectile
    checkProjectileCollisionsAndMarkThemForBoom();
}

function checkProjectileCollisionsAndMarkThemForBoom() {
    let arrayOfProjectilesToMark = [];
    for (let i = 0; i < projectiles.length - 1; i++) {
        let p1 = projectiles[i];
        if (p1 !== undefined && p1[4]) {
            for (let j = i + 1; j < projectiles.length; j++) {
                let p2 = projectiles[j];
                if (p2 !== undefined && p2[4]) {
                    let distBetweenProj = ((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2) ** 0.5;
                    if (distBetweenProj < projCollisionRange) {
                        arrayOfProjectilesToMark.push(p1);
                        arrayOfProjectilesToMark.push(p2);
                    }
                }
            }
        }
    }
    arrayOfProjectilesToMark.forEach((ele) => {ele[4] = 0});
}

// Collision Check Helper Function

function checkCollisions() {
    let wedgeCollided = hasShipCollided(1);
    let needleCollided = hasShipCollided(0);

    if (wedgeCollided) {
        if (needleCollided) {
            // Tie
            return 3;
        } else {
            // Needle won
            return 2;
        }
    } else {
        if (needleCollided) {
            // Wedge won
            return 1;
        } else {
            // Neither won
            return 0;
        }
    }
}

function hasShipCollided(isWedge) {
    let result = false;

    let ship = needle;
    if (isWedge) {
        ship = wedge;
    }
    if ((playerWon === 1 && isWedge === 0) || (playerWon === 2 && isWedge === 1) || (playerWon === 3)) {
        return false;
    }

    let x = ship.x, y = ship.y, h = ship.h;

    // Collision with sun?
    let shipDistFromSun = ((x - 500) ** 2 + (y - 500) ** 2) ** 0.5;
    if (shipDistFromSun < h) {
        let frameArray = projectileTrails.arr[projectileTrails.indexOfLastFilledFrame];
        generateBoom(frameArray, x, y, bigBoomCount, bigBoomRadius / 2, 0);
        if (isWedge) {
            continueBoomWedge = [x, y, bigBoomCount, bigBoomRadius, bigBoomRadius / 2];
        } else {
            continueBoomNeedle = [x, y, bigBoomCount, bigBoomRadius, bigBoomRadius / 2];
        }
        result = true;
    }

    // Collision with projectile?
    projectiles.forEach( function (ele, i) {
        // Is projectile within some distance of ship?
        if ((((x - ele[0]) ** 2 + (y - ele[1]) ** 2) ** 0.5) < 2*h) {
            // Is projectile IN the ship's hitbox?
            if (projectileInHitbox(h, ship.w, x, y, ship.ang, ele[0], ele[1])) {
                // Generate boom for current frameArray
                let frameArray = projectileTrails.arr[projectileTrails.indexOfLastFilledFrame];
                generateBoom(frameArray, x, y, bigBoomCount, bigBoomRadius / 2, 0);
                // Save boom for continuation
                if (isWedge) {
                    continueBoomWedge = [x, y, bigBoomCount, bigBoomRadius, bigBoomRadius / 2];
                } else {
                    continueBoomNeedle = [x, y, bigBoomCount, bigBoomRadius, bigBoomRadius / 2];
                }
                // Delete projectile
                delete projectiles[i];
                result = true;
            }
        }
    });

    // Otherwise, return false
    return result;
}

function projectileInHitbox(h, w, x, y, ang, px, py) {

    // Basic calculations
    let xpc = x * pc, ypc = y * pc;
    let hpc = (h + epsH) * pc, wpc = (w + epsW) * pc;
    let cosAng = Math.cos(ang), sinAng = Math.sin(ang);
    let hpcCosAng = hpc * cosAng, hpcSinAng = hpc * sinAng;

    let pxpc = px * pc, pypc = py * pc;

    // Get triangle vertices
    let x1 = xpc + hpcCosAng, y1 = ypc + hpcSinAng;
    let x2 = xpc - hpcCosAng - wpc * sinAng, y2 = ypc - hpcSinAng + wpc * cosAng;
    let x3 = xpc - hpcCosAng + wpc * sinAng, y3 = ypc - hpcSinAng - wpc * cosAng;

    // Get ship area
    let twiceTriangleArea = 4 * hpc * wpc;

    // Point-to-vertices areas
    let newArea = Math.abs((x1 - pxpc) * (y2 - pypc) - (x2 - pxpc) * (y1 - pypc)) +
                  Math.abs((x2 - pxpc) * (y3 - pypc) - (x3 - pxpc) * (y2 - pypc)) +
                  Math.abs((x3 - pxpc) * (y1 - pypc) - (x1 - pxpc) * (y3 - pypc));

    return (newArea - twiceTriangleArea < arbitraryEpsilon*pc*pc);
}

function resetThingsThatChange() {
    // Reset wedge and needle
    wedge = JSON.parse(JSON.stringify(wedgeBackupCopy));
    needle = JSON.parse(JSON.stringify(needleBackupCopy));
    if (fly_me_to_the_sun) {
        wedge.x = 450;
        wedge.y = 550;
        needle.x = 550;
        needle.y = 450;
    } else if (truly_random_starting_positions) {
        wedge.x = Math.random() * 1000;
        wedge.y = Math.random() * 1000;
        needle.x = Math.random() * 1000;
        needle.y = Math.random() * 1000;
    }

    // Reset projectiles
    projectiles = [];
    if (do_a_projectile_physics_demonstration) {
        projectiles = [[100,200,pewSpeed,0,1],
            [300,400,0,-pewSpeed,1],
            [500,200,-pewSpeed,0,1],
            [700,400,0,pewSpeed,1],
            [710,900,0,-pewSpeed,1],
            [750,400,0,pewSpeed,1],
            [770,900,0,-pewSpeed,1],
            [500,650,-pewSpeed,0,1],
            [950,650,-2*pewSpeed,0,1]];
    } else if (start_with_projectiles_all_over_the_place) {
        projectiles = [];
        for (let i = 0; i < 40; i++) {
            let angle = Math.random() * 2 * Math.PI;
            projectiles.push([Math.random() * 1000,
                Math.random() * 1000,
                Math.cos(angle) * pewSpeed * 0.75,
                Math.sin(angle) * pewSpeed * 0.75,
                1]);
        }
    }
    if (projId > 99) {
        projId = 0;
    } else {
        projId++;
    }
}

// Rendering Helper Functions (Rockets)

function drawRocketsAndTrails() {

    // Simple consistency checking
    if (wedgeTrails.nextI !== needleTrails.nextI) {
        console.log("%cError in length of rocket trails!!", "color: red");
    }

    // Display current position and trails for both rockets
    let i = wedgeTrails.nextI + 1;
    let j = 0;
    let col;
    while (j <= trailFrames) {
        let num = (i - j + trailFrames) % trailFrames;
        let w = wedgeTrails.arr[num];
        let n = needleTrails.arr[num];
        if (w !== undefined && n !== undefined) {
            let opa;
            if (j < trailFrames) {
                opa = Math.max(0.025, ((j / trailFrames) ** 2 * 0.2));
            } else {
                opa = 1;
            }
            let iS = Math.floor(Math.exp(0.2 * (j - trailFrames)) * 100) / 100;
            let fS = 1 - iS;
            col = "rgb( " + (iR * iS + fR * fS) + ", " +
                (iG* iS + fG * fS) + ", " +
                (iB * iS + fB * fS) + ", " +
                opa + ")";
            if (w !== null) {
                drawRocketGivenAFrame(w, col, 1);
            }
            if (n !== null) {
                drawRocketGivenAFrame(n, col, 0);
            }
        }
        j++;
    }

}

function drawRocketGivenAFrame(frame, col, isWedge) {

    let render = renderOneNeedle, ship = needle;
    if (isWedge) {
        render = renderOneWedge;
        ship = wedge;
    }

    // If near edges, draw a copy on the other side
    let low = 1.5 * ship.h, high = 1000 - 1.5 * ship.h;

    // Draw multiple copies if near edges
    if (frame.x < low) {
        render(ship.h, ship.w, frame.x + 1000, frame.y, frame.ang, col, frame.isAcc);
    } else if (high < frame.x) {
        render(ship.h, ship.w, frame.x - 1000, frame.y, frame.ang, col, frame.isAcc);
    }
    if (frame.y < low) {
        render(ship.h, ship.w, frame.x, frame.y + 1000, frame.ang, col, frame.isAcc);
    } else if (high < frame.y) {
        render(ship.h, ship.w, frame.x, frame.y - 1000, frame.ang, col, frame.isAcc);
    }
    render(ship.h, ship.w, frame.x, frame.y, frame.ang, col, frame.isAcc);
}

function renderOneWedge(h, w, x, y, ang, col, acc) {

    // Set up style
    ctx.lineWidth = lineThickness * pc;
    ctx.strokeStyle = col;

    // Basic calculations
    let xpc = x * pc, ypc = y * pc;
    let hpc = h * pc, wpc = w * pc;
    let cosAng = Math.cos(ang), sinAng = Math.sin(ang);
    let hpcCosAng = hpc * cosAng, hpcSinAng = hpc * sinAng;
    let wpcCosAng = wpc * cosAng, wpcSinAng = wpc * sinAng;

    // Points
    let noseX = xpc + hpcCosAng, noseY = ypc + hpcSinAng;
    let sternX = xpc - hpcCosAng, sternY = ypc - hpcSinAng;
    let backX = 0.53 * sternX + 0.47 * noseX, backY = 0.53 * sternY + 0.47 * noseY;
    let back2X = 0.65 * sternX + 0.35 * noseX, back2Y = 0.65 * sternY + 0.35 * noseY;
    let back3X = 0.84 * sternX + 0.16 * noseX, back3Y = 0.84 * sternY + 0.16 * noseY;
    let back4X = 0.9 * sternX + 0.1 * noseX, back4Y = 0.9 * sternY + 0.1 * noseY;
    let rad = 4.72 * wpc, curvature = 4.7 * wpc * 1.145;

    // Draw main body
    ctx.beginPath(); // Start a path (does nothing, really)
    ctx.moveTo(noseX, noseY); // Move to nose
    ctx.arc(backX + rad * sinAng, backY - rad * cosAng, curvature, 61.5/180 * Math.PI + ang,114.67/180 * Math.PI + ang);
    ctx.arc(backX - rad * sinAng, backY + rad * cosAng, curvature, -114.67/180 * Math.PI + ang,-61.5/180 * Math.PI + ang);
    ctx.closePath(); // Draw line back to nose
    ctx.stroke();

    // Draw right fin
    ctx.moveTo(back2X - 0.65 * wpcSinAng, back2Y + 0.65 * wpcCosAng);
    ctx.lineTo(back3X - 1.15 * wpcSinAng, back3Y + 1.15 * wpcCosAng);
    ctx.lineTo(sternX - 1.2 * wpcSinAng, sternY + 1.2 * wpcCosAng);
    ctx.lineTo(sternX - 0.7 * wpcSinAng, sternY + 0.7 * wpcCosAng);
    ctx.lineTo(back4X - 0.35 * wpcSinAng, back4Y + 0.35 * wpcCosAng);
    ctx.stroke();

    // Draw left fin
    ctx.moveTo(back4X + 0.35 * wpcSinAng, back4Y - 0.35 * wpcCosAng);
    ctx.lineTo(sternX + 0.7 * wpcSinAng, sternY - 0.7 * wpcCosAng);
    ctx.lineTo(sternX + 1.2 * wpcSinAng, sternY - 1.2 * wpcCosAng);
    ctx.lineTo(back3X + 1.15 * wpcSinAng, back3Y - 1.15 * wpcCosAng);
    ctx.lineTo(back2X + 0.65 * wpcSinAng, back2Y - 0.65 * wpcCosAng);
    ctx.stroke();

    // Draw exhaust
    if (acc) {
        ctx.moveTo(sternX, sternY); // Move to stern center
        ctx.lineTo(sternX - acc * pc * cosAng, sternY - acc * pc * sinAng); // Draw line to tip of exhaust
        ctx.stroke();
    }
}

function renderOneNeedle(h, w, x, y, ang, col, acc) {

    // Set up style
    ctx.lineWidth = lineThickness * pc;
    ctx.strokeStyle = col;

    // Basic calculations
    let xpc = x * pc, ypc = y * pc;
    let hpc = h * pc, wpc = w * pc;
    let cosAng = Math.cos(ang), sinAng = Math.sin(ang);
    let hpcCosAng = hpc * cosAng, hpcSinAng = hpc * sinAng;
    let wpcCosAng = wpc * cosAng, wpcSinAng = wpc * sinAng;
    let w1wpcCosAng = wpcCosAng * 2 / 9, w1wpcSinAng = wpcSinAng * 2 / 9;
    let w2wpcCosAng = wpcCosAng * 17 / 30, w2wpcSinAng = wpcSinAng * 17 / 30;
    let w3wpcCosAng = wpcCosAng * 2 / 3, w3wpcSinAng = wpcSinAng * 2 / 3;

    // Points
    let noseX = xpc + hpcCosAng, noseY = ypc + hpcSinAng;
    let sternX = xpc - hpcCosAng, sternY = ypc - hpcSinAng;
    let frontX = 0.15 * sternX + 0.85 * noseX, frontY = 0.15 * sternY + 0.85 * noseY;
    let front2X = 0.66 * sternX + 0.34 * noseX, front2Y = 0.66 * sternY + 0.34 * noseY;
    let front3X = 0.68 * sternX + 0.32 * noseX, front3Y = 0.68 * sternY + 0.32 * noseY;

    // Draw main body
    ctx.beginPath(); // Start a path (does nothing, really)
    ctx.moveTo(noseX, noseY); // Move to nose
    ctx.lineTo(frontX - w1wpcSinAng, frontY + w1wpcCosAng);
    ctx.lineTo(sternX - w1wpcSinAng, sternY + w1wpcCosAng); // Draw line to stern port
    ctx.lineTo(sternX + w1wpcSinAng, sternY - w1wpcCosAng); // Draw line to stern starboard
    ctx.lineTo(frontX + w1wpcSinAng, frontY - w1wpcCosAng);
    ctx.closePath(); // Draw line back to nose
    ctx.stroke();

    // Draw right fin
    ctx.moveTo(front2X - w1wpcSinAng, front2Y + w1wpcCosAng);
    ctx.lineTo(front2X - w2wpcSinAng, front2Y + w2wpcCosAng);
    ctx.lineTo(front3X - w3wpcSinAng, front3Y + w3wpcCosAng);
    ctx.lineTo(sternX - w3wpcSinAng, sternY + w3wpcCosAng);
    ctx.lineTo(sternX - w1wpcSinAng, sternY + w1wpcCosAng);
    ctx.stroke();

    // Draw right fin
    ctx.moveTo(sternX + w1wpcSinAng, sternY - w1wpcCosAng);
    ctx.lineTo(sternX + w3wpcSinAng, sternY - w3wpcCosAng);
    ctx.lineTo(front3X + w3wpcSinAng, front3Y - w3wpcCosAng);
    ctx.lineTo(front2X + w2wpcSinAng, front2Y - w2wpcCosAng);
    ctx.lineTo(front2X + w1wpcSinAng, front2Y - w1wpcCosAng);
    ctx.stroke();

    // Draw exhaust
    if (acc) {
        ctx.moveTo(sternX, sternY); // Move to stern center
        ctx.lineTo(sternX - acc * pc * cosAng, sternY - acc * pc * sinAng); // Draw line to tip of exhaust
        ctx.stroke();
    }
}

// Rendering Helper Functions (Projectiles, Star Field, Star)

function drawProjectilesAndTrails() {
    let i = projectileTrails.nextI + 1;
    let j = 0;
    let col;
    while (j <= trailFrames) {
        let p = projectileTrails.arr[(i - j + trailFrames) % trailFrames];
        if (p !== undefined) {
            let opa;
            if (j < trailFrames) {
                opa = Math.floor((j / trailFrames) ** 6 * 0.8 * 100) / 100;
            } else {
                opa = 1;
            }
            let iS = Math.floor(Math.exp(0.5 * (j - trailFrames)) * 100) / 100;
            let fS = 1 - iS;
            col = "rgb( " + (iR * iS + fR * fS) + ", " +
                (iG* iS + fG * fS) + ", " +
                (iB * iS + fB * fS) + ", " +
                opa + ")";
            drawDotsGivenAFrame(p, col);
        }
        j++;
    }
}

function drawDotsGivenAFrame(arrayOfTuples, col) {
    ctx.fillStyle = col;
    arrayOfTuples.forEach(function (ele) {
        ctx.fillRect(ele[0] * pc,
            ele[1] * pc,
            dotThickness * pc, dotThickness * pc);
    });
}

function drawSun() {
    // Generate sun
    let angle = 2 * Math.PI * Math.random();
    let randV = Math.random();
    let length = minSunLength + (maxSunLength - minSunLength) * randV;
    sunTrails.myPush(angle, length);

    // Draw newly-generated one, as well as its past instances
    let i = projectileTrails.nextI + 1;
    let j = 0;
    let col;
    while (j <= trailFrames) {
        let sun = sunTrails.arr[(i - j + trailFrames) % trailFrames];
        if (sun !== undefined) {
            let opa;
            if (j < trailFrames - 1) {
                opa = Math.floor((j / trailFrames) ** 6 * 0.8 * 100) / 100;
            } else {
                opa = 1;
            }
            let iS = Math.floor(Math.exp(0.5 * (j - trailFrames)) * 100) / 100;
            let fS = 1 - iS;
            col = "rgb( " + (iR * iS + fR * fS) + ", " +
                (iG* iS + fG * fS) + ", " +
                (iB * iS + fB * fS) + ", " +
                opa + ")";
            renderSingleSunLine(sun.ang, sun.len, col);
        }
        j++;
    }
}

function renderSingleSunLine(ang, len, col) {
    // Basic calculations
    let centre = 500 * pc, radius = len * pc / 2;
    let cosAng = Math.cos(ang), sinAng = Math.sin(ang);
    let lenCosAng = radius * cosAng, lenSinAng = radius* sinAng;

    // Actual drawing
    ctx.beginPath(); // Start a path (does nothing, really)
    ctx.moveTo(centre + lenCosAng, centre + lenSinAng); // one end
    ctx.lineTo(centre - lenCosAng, centre - lenSinAng); // other end
    ctx.closePath(); // Draw line back to first end
    ctx.lineWidth = lineThickness * pc;
    ctx.strokeStyle = col;
    ctx.stroke();
}

function drawStars() {
    // Each star has a default brightness of 0.6; doubled stars would have 0.96
    let opa = 0.6;
    ctx.fillStyle = "rgb( " + iR + ", " + iG + ", " + iB + ", " + opa + ")";
    stars.forEach(function (ele) {
        let jitterX = Math.random() * starJitter;
        let jitterY = Math.random() * starJitter;
        ctx.fillRect((ele[0] + jitterX) * pc,
                     (ele[1] + jitterY) * pc,
                     dotThickness * pc, dotThickness * pc);
    })
}

function redrawCurrentProjectilesAndRockets() {
    let col = "rgb( " + iR + ", " + iG + ", " + iB + ", 1)";
    switch (playerWon) {
        case 0: {
            drawRocketGivenAFrame(wedge, col, 1);
            drawRocketGivenAFrame(needle, col, 0);
            break;
        }
        case 1: {
            drawRocketGivenAFrame(wedge, col, 1);
            break;
        }
        case 2: {
            drawRocketGivenAFrame(needle, col, 0);
            break;
        }
    }
    let p = projectileTrails.arr[projectileTrails.nextI + 1];
    if (p !== undefined) {
        drawDotsGivenAFrame(p, col);
    }
}

// Other Helper Functions

function tryToPew(isWedge) {

    let ship = needle;
    if (isWedge) {
        ship = wedge;
    }
    if ((playerWon === 1 && isWedge === 0) || (playerWon === 2 && isWedge === 1) || (playerWon === 3)) {
        return;
    }

    if (!ship.pewOff) {
        console.log("%cpew!", "color: lightblue");
        let id = projId;
        projectiles[id] = [
            ship.x + (ship.h + pewOffset) * Math.cos(ship.ang),
            ship.y + (ship.h + pewOffset) * Math.sin(ship.ang),
            pewSpeed * Math.cos(ship.ang) + ship.vx,
            pewSpeed * Math.sin(ship.ang) + ship.vy,
            1,
        ];
        projId++;
        ship.pewOff = true;
        // After some time, modify the projectile to be "unused"
        setTimeout(function (id) { return function() {
            if (projectiles[id]) projectiles[id][4] = 0;
        }}(id), lifetimeOfPew);
        // After some time, allow shooting again
        setTimeout(() => {ship.pewOff = false}, delayBetweenPews);
    }
}

function generateBoom(frameArray, x, y, c, r, low) {
    for (let i = 0; i < c; i++) {
        let theta = 2 * Math.PI * Math.random();
        let randV = (Math.random() + Math.random() + Math.random() + Math.random()) / 2 - 1;
        let d = (r - low) * randV + randV * low;
        let boomParticleX = x + d * Math.cos(theta);
        let boomParticleY = y + d * Math.sin(theta);
        if (boomParticleX > 1000) {
            boomParticleX = boomParticleX % 1000;
        } else if (boomParticleX < 0) {
            boomParticleX = boomParticleX % 1000 + 1000;
        }
        if (boomParticleY > 1000) {
            boomParticleY = boomParticleY % 1000;
        } else if (boomParticleY < 0) {
            boomParticleY = boomParticleY % 1000 + 1000;
        }
        frameArray.push([boomParticleX, boomParticleY]);
    }
}

function deepCopy(object) {
    return JSON.parse(JSON.stringify(object));
}

function initializeStars() {
    for (let i = 0; i < starCount; i++) {
        let x = 25 + 950 * Math.random();
        let y = 25 + 950 * Math.random();
        stars.push([x, y]);
        // For about half the stars, "double" their brightness
        if (Math.random() > 0.5) {
            stars.push([x, y]);
        }
    }
}

// COMPLETELY IRRELEVANT mouse-light-pen things

window.addEventListener("mousemove", windowUpdateMousePosition);

function switchLightPenModeOnClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (lightPenModeIsOn) {
        lightPenModeIsOn = false;
        myGameArea.canvas.style.cursor = "pointer";
    } else {
        lightPenModeIsOn = true;
        myGameArea.canvas.style.cursor = "none";
    }
}

function windowUpdateMousePosition(e) {
    let el = myGameArea.canvas;
    let offsetX = el.getBoundingClientRect().left +
                  el.ownerDocument.defaultView.pageXOffset;
    let offsetY = el.getBoundingClientRect().top +
                  el.ownerDocument.defaultView.pageYOffset;
    mouseTrails.mouseX = (e.pageX - offsetX) / actualDim * 1000;
    mouseTrails.mouseY = (e.pageY - offsetY) / actualDim * 1000;
}

function perFrameAddMousePosition() {
    if (lightPenModeIsOn) {
        let x = mouseTrails.mouseX;
        let y = mouseTrails.mouseY;
        if ((x > 0) && (x < 1000) && (y > 0) && (y < 1000)) {
            mouseTrails.myPush(x,y);
        } else {
            mouseTrails.myPushNull();
        }
    } else {
        mouseTrails.myPushNull();
    }
}

function drawMouseTrail() {
    let i = projectileTrails.nextI + 1;
    let j = 0;
    let col;
    while (j <= trailFrames) {
        let p = mouseTrails.arr[(i - j + trailFrames) % trailFrames];
        if (p !== undefined && p !== null) {
            let opa;
            if (j < trailFrames) {
                opa = Math.floor((j / trailFrames) ** 6 * 0.8 * 100) / 100;
            } else {
                opa = 1;
            }
            let iS = Math.floor(Math.exp(0.5 * (j - trailFrames)) * 100) / 100;
            let fS = 1 - iS;
            col = "rgb( " + (iR * iS + fR * fS) + ", " +
                (iG* iS + fG * fS) + ", " +
                (iB * iS + fB * fS) + ", " +
                opa + ")";
            ctx.fillStyle = col;
            ctx.fillRect(p.x * pc,
                p.y * pc,
                dotThickness * pc, dotThickness * pc);
        }
        j++;
    }
}