/** 
 * Functions for running a visual representation of the fishery simulation.
 * Starting point taken from tutorial by Steven Lambert @ 
 * http://blog.sklambert.com/html5-canvas-game-the-enemy-ships/ 
*/

/**
 * Class for storing fishery simulation data.
 * @class
 */
function SimulationData() {
    this.ui = null;
    this.settings = {};
    this.vegetation_layer = [];
    this.fish_list = [];
    this.fishery_id = 0;
    this.results = [];
    this.draw_coordinates = [];
    this.anim = null;
    this .global_anim_bool = 0;
}
/** 
 * Status of simulation is stored in the global variable SIMULATION. 
 * It is updated by AJAX calls as the simulation progresses. 
 * To be removed as global variables are BAD?
 */
var SIMULATION = new SimulationData();

/** 
 * @description Progresses simulation n steps. Uses AJAX request with simulation
 * ID and number of steps. The response is expected to contain simulation results
 * as well as vegetation layer and fish information. These are stored in the 
 * SIMULATION object. Should ONLY be called after the simulation has been initialized.
 */
function progressSimulation(fishery_id, steps) {
    $.post('progress_simulation/', { 'fishery_id': fishery_id, 'steps': steps },
        function (data, status) {
            SIMULATION.vegetation_layer = data['vegetation_layer'];
            SIMULATION.fish_list = data['fish_list'];
            SIMULATION.results = data['simulation_results'];
    });
}
/** 
 * @description Frees memory of simulation on server, used when browser quits.
 */
function endSimulation() {
    $.post("end_simulation/", {'fishery_id': SIMULATION.fishery_id });
}
/**
 * Class for simulation drawing objects (background, vegetation, fish).
 * @class
 */
function Drawable() {
    this.init = function(x, y, width, height) {
        // Default variables
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    // Define abstract function to be implemented in child objects.
    this.draw = function() {};
}
/**
 * @description Calculates coordinates for drawing signs for each fish 
 * population level.
 * @param {number} level Population level.
 * @param {number} width Width of drawing area.
 * @param {number} height Height of drawing area.
 * @returns {number[][]} Array of arrays of x and y-coordinates.
 */
function getDrawCoords(level, width, height) {
    var n_x, n_y, ii, jj;
    var x_coords = [];
    var y_coords = [];
    // Find out how densely objects need to be placed.
    n_x = Math.ceil(Math.sqrt(level));
    n_y = Math.ceil(level / n_x);

    // Calculate coordinates.
    // Case of only one dimension.
    if (n_y == 1) {
        for (ii = 0; ii < n_x; ii++) {
            x_coords.push(ii * width / (n_x - 1) - width / 2);
            y_coords.push(0);
            level--;
            if (level < 1) { return [x_coords, y_coords]; }
        }
    }
    // Case of two dimensions.
    for (jj = 0; jj < n_y; jj++) {
        for (ii = 0; ii < n_x; ii++) {
            x_coords.push(ii * width / (n_x - 1) - width / 2);
            y_coords.push(jj * height / (n_y - 1) - height / 2);
            level--;
            if (level < 1) { return [x_coords, y_coords]; }
        }
    }
    return [x_coords, y_coords];
}
/**
 * Class for the background of the simulation, i.e. grid shown in the simulation. 
 * @class
 */
function Background() {
    // Implement abstract function
    this.draw = function () {
        this.context.fillStyle = "#E8E8E8";
        this.context.fillRect(this.x, this.y, this.canvasWidth, this.canvasHeight);
    }
    this.drawGrid = function () {
        var n_x, n_y, i;
        //Grid
        this.context.fillStyle = "#E8E8E8";
        n_x = this.canvasWidth / SIMULATION.settings.size_x;
        n_y = this.canvasHeight / SIMULATION.settings.size_y;
        for (i = 0; i < SIMULATION.settings.size_x; i++) {
            this.context.beginPath();
            this.context.moveTo(i * n_x, 0);
            this.context.lineTo(i * n_x, this.canvasHeight);
            this.context.stroke();
        }
        for (i = 0; i < SIMULATION.settings.size_y; i++) {
            this.context.beginPath();
            this.context.moveTo(0, i * n_y);
            this.context.lineTo(this.canvasWidth, i * n_y);
            this.context.stroke();
        }
        this.context.beginPath();
        this.context.moveTo(this.canvasWidth, this.canvasHeight);
        this.context.lineTo(this.canvasWidth, 0);
        this.context.stroke();  
    }
}
// Set Background to inherit properties from Drawable
Background.prototype = new Drawable();
/**
 * Class for the vegetation layer. Stores vegetation layer status and
 * contains the drawing function for the layer.
 * @class
 */
function vegetationLayer() {
    this.radius = 6.5; // should scale according to layer size
    this.thickness = 1.5; // should scale according to layer size
    // Implement abstract draw function
    this.draw = function () {
        var i, R, G, B, vegsum = 0;
        this.context.lineWidth = this.thickness;
        if (SIMULATION.vegetation_layer.length > 0) {
            for (i = 0; i < SIMULATION.vegetation_layer.length; i++) {
                // Dark green to green scale to indicate vegetation level.
                vegsum += SIMULATION.vegetation_layer[i];
                R = 0;
                G = Math.floor(((255 - 150) * (SIMULATION.vegetation_layer[i])) / 6) + 150;
                B = 0;
                this.context.fillStyle = "rgb(" + R + ", " +
                    G + ", " + B + ")";
                this.x = (i % SIMULATION.settings.size_x + 0.5) *
                    this.canvasWidth / SIMULATION.settings.size_x;
                this.y = (Math.floor(i / SIMULATION.settings.size_x) + 0.5) *
                    this.canvasHeight / SIMULATION.settings.size_y;
                this.context.fillRect(
                    this.x - this.canvasWidth / SIMULATION.settings.size_x / 2 + 2,
                    this.y - this.canvasHeight / SIMULATION.settings.size_y / 2 + 2,
                    this.canvasWidth / SIMULATION.settings.size_x - 4,
                    this.canvasHeight / SIMULATION.settings.size_y - 4);
            }
            $("[name=vege_tot]").val(vegsum);
        }
    }
}
// Set Vegetation layer to inherit properties from Drawable
vegetationLayer.prototype = new Drawable();
/**
 * Class for the fish layer. Stores fish layer status and
 * contains the drawing function for the layer.
 * @class
 */
function fishLayer() {
    this.radius = 6.5; // should scale according to layer size
    this.thickness = 1.5; // should scale according to layer size
    // Implement abstract draw function
    this.draw = function () {
        var i, j, fish_n, x_y_coords;
        this.context.strokeStyle = "blue";
        this.context.lineWidth = this.thickness;
        this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        if (SIMULATION.fish_list.length > 0) {
            fish_n = SIMULATION.fish_list.length;
            $("[name=fish_n]").val(fish_n);
            $("[name=fish_yield]").val(SIMULATION.results[1]);
            for (i = 0; i < fish_n; i++) {
                this.x = (SIMULATION.fish_list[i][0] % SIMULATION.settings.size_x + 0.5) *
                    this.canvasWidth / SIMULATION.settings.size_x;
                this.y =
                    (Math.floor(SIMULATION.fish_list[i][0] / SIMULATION.settings.size_x) + 0.5) *
                    this.canvasHeight / SIMULATION.settings.size_y;
                if (SIMULATION.fish_list[i][1] === 1) {
                    this.context.beginPath();
                    this.context.arc(
                        this.x, this.y, this.radius, 0, 2 * Math.PI);
                    this.context.stroke();
                }
                else {
                    x_y_coords = SIMULATION.draw_coordinates[SIMULATION.fish_list[i][1] - 2];
                    for (j = 0; j < SIMULATION.fish_list[i][1]; j++) {
                         this.context.beginPath();
                         this.context.arc(this.x + x_y_coords[0][j],
                             this.y + x_y_coords[1][j],
                             this.radius, 0, 2 * Math.PI);
                         this.context.stroke();
                     }
                }
            }
        }
    }
    this.calcDrawCoords = function() {
        // Calculate fish population drawing coordinates for the fish layer.
        for (i = 2; i <= SIMULATION.settings['fish_level_max']; i++)
            SIMULATION.draw_coordinates.push(
                getDrawCoords(i, this.width / SIMULATION.settings.size_x -
                    7 * this.radius,
                    this.height / SIMULATION.settings.size_y - 5 * this.radius));
    }
}
// Set fish layer to inherit properties from Drawable.
fishLayer.prototype = new Drawable();

/** Creates the Fishery object which will hold all information. **/
/**
 * Class for the entire fishery. Stores all different layers and contains
 * functions for animating the fishery. 
 * @class
 */
function Simulation() {   
    /** Gets canvas information and context, also sets up the fishery
     * simulation. Returns true if canvas is supported by browser and false if it 
     * is not. This prevents the animation script from constantly running on
     * browsers not supporting canvas. 
     * @return {number}
     */
    this.init = function () {
        // Get the canvas elements.
        this.bgCanvas =
            document.getElementById('background');
        this.vegetationLayerCanvas =
            document.getElementById('vegetation_layer');
        this.fishLayerCanvas =
            document.getElementById('fish_layer');

        // If canvas is supported by browser.
        if (this.bgCanvas.getContext) {
            this.bgContext = this.bgCanvas.getContext('2d');
            this.vegetationLayerContext =
                this.vegetationLayerCanvas.getContext('2d');
            this.fishLayerContext = this.fishLayerCanvas.getContext('2d');

            // Initialize objects.
            Background.prototype.context = this.bgContext;
            Background.prototype.canvasWidth = this.bgCanvas.width;
            Background.prototype.canvasHeight = this.bgCanvas.height;

            vegetationLayer.prototype.context =
                this.vegetationLayerContext;
            vegetationLayer.prototype.canvasWidth =
                this.vegetationLayerCanvas.width;
            vegetationLayer.prototype.canvasHeight =
                this.vegetationLayerCanvas.height;

            fishLayer.prototype.context = this.fishLayerContext;
            fishLayer.prototype.canvasWidth = this.fishLayerCanvas.width;
            fishLayer.prototype.canvasHeight = this.fishLayerCanvas.height;

            // Initialize the background object.
            this.background = new Background();
            this.background.init(
                0, 0, this.bgCanvas.width, this.bgCanvas.height);

            // Initialize the vegetation layer object.
            this.vegetationLayer = new vegetationLayer();
            this.vegetationLayer.init(0, 0, this.vegetationLayerCanvas.width,
                this.vegetationLayerCanvas.height);

            // Initialize the fish layer object.
            this.fishLayer = new fishLayer();
            this.fishLayer.init(0, 0, this.vegetationLayerCanvas.width,
                this.vegetationLayerCanvas.height);
            this.fishLayer.calcDrawCoords();

            return true;
        } else { return false; }
    };

// Starts the animation loop.
    this.start = function () {
        cancelAnimationFrame(SIMULATION.anim);
        SIMULATION.global_anim_bool = 0;
        // Enable "start animation" button.
        $("[name=update_fishery]").prop("disabled", 0);
        $("[name=fish_n]").val(SIMULATION.fish_list.length);
        this.background.context.clearRect(0, 0, this.background.canvasWidth,
            this.background.canvasHeight);
        this.vegetationLayer.context.clearRect(0, 0,
            this.vegetationLayer.canvasWidth,
            this.vegetationLayer.canvasHeight);
        this.background.draw();
        this.vegetationLayer.draw();
        this.fishLayer.draw();
        this.background.drawGrid();
    };
    this.start_with_update = function () {
        if (!SIMULATION.global_anim_bool) {
            // Disable "start animation" button while animation is running.
            $("[name=update_fishery]").prop("disabled", 1);
            SIMULATION.global_anim_bool = 1;
            // animate_update_no_RAF();
            animate_update();
        }
    };
}

/**
* @description The animation loop. Calls the requestAnimationFrame shim to
* optimize the game loop and draws all game objects. This
* function must be a global function and cannot be within an
* object.
* NOT USED BECAUSE ....
*/
function animate_update() {
    SIMULATION.ui.background.draw();
    SIMULATION.ui.vegetationLayer.draw();
    SIMULATION.ui.fishLayer.draw();
    SIMULATION.ui.background.drawGrid();
    progressSimulation(SIMULATION.fishery_id, 1);
    if (SIMULATION.global_anim_bool)
        window.setTimeout(function () {
            if (SIMULATION.global_anim_bool) { SIMULATION.anim = requestAnimFrame(animate_update); }
        }, 1000 / 1);
}
/**
* @descrption requestAnim shim layer by Paul Irish
* Finds the first API that works to optimize the animation loop,
* otherwise defaults to setTimeout().
*/
window.requestAnimFrame = (function(){
    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function (/* function */ callback, /* DOMElement */ element) {
          window.setTimeout(callback, 1000 / 60);
      };
})();
/** 
 * @description Function to (re)start fishery. Collects settings from the 
 * server, initiates canvases / objects. 
 */
function init() {
    SIMULATION.global_anim_bool = 0;
    /* Chain AJAX to ensure fishery and settings are properly loaded.*/
    $.post("get_settings/", {},
                function (data, status)
                {
                    var i = 0;
                    SIMULATION.settings = data['settings'];
                    $.post("create_simulation/",
                        function (data, status) {
                               SIMULATION.fishery_id = data['fishery_id'];
                               $.post("simulation_status/",
                                   { 'fishery_id': SIMULATION.fishery_id },
                                   function (data, status) {
                                       if (SIMULATION.ui == null) {
                                           SIMULATION.ui = new Simulation();
                                           SIMULATION.ui.init();
                                       }
                                       SIMULATION.fish_list = data['fish_list'];
                                       SIMULATION.vegetation_layer = data['vegetation_layer'];
                                       SIMULATION.ui.start();
                                   })
                           })
                });
}

/** Django csrf stuff, straight from django website.. **/
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue =
                    decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
var csrftoken = getCookie('csrftoken');
function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}
$.ajaxSetup({
    beforeSend: function (xhr, settings) {
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});
// Make sure memory is freed on the server when user moves on. 
window.addEventListener("beforeunload", endSimulation);
window.init();