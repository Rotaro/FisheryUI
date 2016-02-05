/* GLOBAL VARIABLES FOR RUNNING BATCH JOB (maybe replace later with something more appopriate. */

var N_JOBS = 0; // Used as progress tracker while batch study is running.
var RESULTS = []; // Stores results of the batch study.
var STATIC_SETTINGS = []; // Stores static settings during batch studies.
var COMBINATIONS = []; // Stores different combinations for the batch run.
var DEFAULT_SETTING = {}; // Stores the default setting, i.e. setting which is swept for each combination.
var STUDY_SETTINGS = []; // Stores the settings which are swept over during the study.
var CHARTS = []; // Stores chart objects after study run.

/*
 * Class for storing how setting is changed during study.
 */
function StudySetting(setting_id, index, combos) {
    var i = 0;
    this.setting_id = setting_id;
    this.index = index;
    this.axis = [];
    
    for (i=0; i < combos.length; i++){
        this.axis.push(combos[i]);
    }
}
/*
 * Class for storing and drawing batch study results.
 */
function Chart(n_setting, chart_element) {
    this.axes = [];
    this.chart_element = chart_element;

    //results.fish_n, results.yield, results.vegetation_n, 
    //	results.fish_n_std_dev, results.yield_std_dev, results.vegetation_n_std_dev, 
    //	results.steps, results.debug_stuff, fishery->settings->fishing_chance);

    // Chart info
    this.headers = ["Fish Population", "Fish Yield",
                    "Vegetation", "Fish Pop Std Dev", "Fish Yield Std Dev",
                    "Vegetation Std Dev"];
    this.setting_id = STUDY_SETTINGS[n_setting].setting_id;
    this.setting_axis = STUDY_SETTINGS[n_setting].axis;
    this.index = STUDY_SETTINGS[n_setting].index;

    // Set drop down options.
    dropdowns = $(chart_element).find("div.drop_down select");
    for (i = 0; i < dropdowns.length; i++) {
        $(dropdowns[i]).attr("onchange", "updateChart(this);")
        $(dropdowns[i]).append("<option value='0'>" + DEFAULT_SETTING.setting_id + " - "
            + DEFAULT_SETTING.index + "</option>");
        for (j = 0; j < this.headers.length; j++) {
            $(dropdowns[i]).append("<option value='" + (j + 1).toString() + "'>" +
                this.headers[j] + "</option>");
        }
    }
    // Set starting axes
    $($(dropdowns[0]).find("option[value=0]")[0]).attr("selected", "selected");
    $($(dropdowns[1]).find("option[value=2]")[0]).attr("selected", "selected");

    // Store results in format suitable for Google Visualization
    // First per setting value
    for (i = 0; i < this.setting_axis.length; i++) {
        this.axes.push([]);
        // Headers for result entries
        this.axes[i].push(["Default"].concat(this.headers));
        // Second by default setting 
        for (j = 0; j < DEFAULT_SETTING.axis.length; j++) {
            // Third by result type (see this.headers)
            this.axes[i].push([DEFAULT_SETTING.axis[j]]);
            for (k = 0; k < this.headers.length; k++) {
                this.axes[i][j + 1].push(RESULTS[n_setting][i][j][k]);
            }
        }
    }
    /*
     * Draws chart with x as x-axis and y as y-axis.
     * x, y - integer where:
     *        0 - Default Setting, 1 - Fish Pop, 2 - Fish Yield,
     *        3 - Vegetation, 4 - Fish Pop StdDev, 5 - Fish Yield Std Dev,
     *        6 - Vegetation Std Dev.
     */
    this.draw = function(x, y) {
        var data, i, j, k, new_row, x_label, y_label, x_index, y_index, y_err_index = -1;
        // Set axes labels
        chart_title = this.setting_id + " - " + this.index
        // Add headers in data
        header = [[DEFAULT_SETTING.setting_id].concat(this.headers)[x]];
        for (i = 0; i < this.setting_axis.length; i++)
            header.push(this.setting_axis[i].toString());
        data = [header];
        // First by setting value
        for (i = 0; i < this.setting_axis.length; i++) {
            // Second by default setting length
            for (j = 0; j < DEFAULT_SETTING.axis.length; j++) {
                row = [this.axes[i][j + 1][x]];
                for (k = 0; k < this.setting_axis.length; k++) row.push(null);
                row[i + 1] = this.axes[i][j + 1][y];
                console.log(row);
                data.push(row);
            }
        }
        console.log(data);
        data = google.visualization.arrayToDataTable(data);
        x_label = [DEFAULT_SETTING.setting_id].concat(this.headers)[x];
        y_label = [DEFAULT_SETTING.setting_id].concat(this.headers)[y];

        // sort data according to x-axis data
        data.sort([{ column: 0 }]);

        var options = {
            title: chart_title,
            curveType: 'function',
            interpolateNulls: true,
            legend: { position: 'top' },
            hAxes: {
                0: { title: x_label }
            },
            vAxes: {
                0: { title: y_label }
            },
            pointSize: 5,
            intervals: { style: 'bars', barwidth: 1 }
        };
        var chart = new google.visualization.LineChart(
            this.chart_element.find(".chart_area")[0]);
        chart.draw(data, options);
    }
}
/*
 * Calculates combinations of setting based on start, end and interval.
 * 
 * Returns list containing setting values (integers).
 */
function calculateCombos(start, end, interval) {
    var values = [];
    var i = 1;

    values.push(start);
    if (interval > 0) {
        while (start + i * interval < end)
            values.push(start + interval * i++);
    }
    if (start !== end)
        values.push(end);

    return values
}
/* 
 * Gathers all setting combinations to be studied. Results are stored in the
 * global variables. Only called once both default setting and at least one
 * included setting are set.
 *
 * Returns list of lists, where each entry is one combination:
 * [#setting, #setting value, #default setting value, 
 * setting_id, setting_index, setting_value
 * default_setting_id, default_setting_index, default_setting_value]
 */
function getCombinations() {
    var tr_element = {}, tr_elements = {}, tr_default = {};
    var combinations = [], combos = [], default_setting = [];
    var i = 0, j = 0, k = 0, n_run = 0, combo = 0, index = 0, start = 0, end = 0, interval = 0;
    
    /* Reset global varibles. */
    RESULTS = [];
    DEFAULT_SETTING = {};
    STUDY_SETTINGS = [];
    COMBINATIONS = [];

    /* Find default setting. */
    tr_default = $("td#setting_default input[disabled!=disabled]").parents("tr");
    combos = calculateCombos(
        parseInt($(tr_default).find("td#setting_srt input")[0].value),
        parseInt($(tr_default).find("td#setting_end input")[0].value),
        parseInt($(tr_default).find("td#setting_int input")[0].value));
    DEFAULT_SETTING = new StudySetting(
        tr_default.attr("id"), 
        parseInt($(tr_default).find("td#setting_idx input")[0].value),
        combos);

    /* Create study settings. */
    tr_elements = $("table#settings tbody").find("tr");
    for (i = 0; i < tr_elements.length; i++) {
        /* If setting included in batch study and not default setting */
        if ($(tr_elements[i]).find("td#setting_included input")[0].checked && 
            !($(tr_elements[i]).find("td#setting_default input")[0].checked)) {
            RESULTS.push([]);
            index = parseInt($(tr_elements[i]).find("td#setting_idx input")[0].value);
            combos = calculateCombos(
                parseInt($(tr_elements[i]).find("td#setting_srt input")[0].value),
                parseInt($(tr_elements[i]).find("td#setting_end input")[0].value),
                parseInt($(tr_elements[i]).find("td#setting_int input")[0].value));
            STUDY_SETTINGS.push(new StudySetting(tr_elements[i].id, index, combos));
            /* For each setting value */
            for (j = 0; j < combos.length; j++) {
                RESULTS[n_run].push([]);
                /* For each default setting value */ 
                for (k = 0; k < DEFAULT_SETTING.axis.length; k++) {
                    RESULTS[n_run][j].push([]);
                    COMBINATIONS.push([n_run, j, k, tr_elements[i].id, index, parseInt(combos[j]),
                        DEFAULT_SETTING.setting_id, DEFAULT_SETTING.index, DEFAULT_SETTING.axis[k]]);
                }
            }
            n_run += 1;
        }
    }
}
/*
 * Collects static settings.
 *
 * Returns list of lists where each entry is a static setting, i.e.:
 * [setting_id, setting_index, setting_value]
*/
function getStaticSettings() {
    var tr_element = {}, tr_elements = {};
    var static_settings = [];
    var i=0;
    /* Get tr elements for settings. */
    tr_elements = $("table#settings tbody").find("tr");
    for (i = 0; i < tr_elements.length; i++) {
        static_settings.push([tr_elements[i].id,
            parseInt($(tr_elements[i]).find("td#setting_idx input")[0].value),
            parseInt($(tr_elements[i]).find("td#setting_val input")[0].value)]);
    }
    /* Store in global variable. */
    STATIC_SETTINGS = static_settings;
    return static_settings;
}

/* 
 * Function for drawing charts of results.
 *
 */
function drawCharts() {
    var n, n_x, n_y, i, chart_width, chart_height;

    n = RESULTS.length;

    n_x = Math.ceil(Math.sqrt(n)); // charts per row
    n_y = Math.ceil(n / n_x); // rows of charts

    // dimensions of chart areas
    $("div#charts").css("transform", "translate(0%, 0)");
    $("div#charts").css("position", "static");
    $("div#charts").css("float", "left");
    $("div#charts").width($("#batch_study").width());
    $("div#charts").height($(window).height() * 0.88);
    // take into account margin, border, padding, etc
    chart_width = ($("div#charts").width() - n_x * 25) / n_x;
    chart_height = ($("div#charts").height() - n_y * 35) / (n_y);
    // create charts
    for (i = 0; i < n; i++) {
        $("div#charts").append('<div class="chart" chartid=' +
            i.toString() + '>                                      \
            <div class="chart_area"></div>                         \
            <div class="drop_down"><div id="x-axis"><span>X-axis: </span><select/></div>         \
            <div id="y-axis"><span>Y-axis: </span><select/></div></div></div>');
        if (i + 1 == n_x) {
            $("div#charts").append('<div class="clear" />');
        }
    }
    //$(".drop_down").css("height", chart_height * 0.12);
    $(".drop_down").css("font-size", chart_height * 0.05);
    $(".drop_down select").css("font-size", chart_height * 0.05);

    $("div.chart").css("width", chart_width);
    $("div.chart").css("height", chart_height);
}


/* 
 * AJAX call for part of batch study run. 
 *
 * On completion will decrease the global variable N_JOBS by one. Once it 
 * reaches 0, the draw function for the charts is called.
 *
 */
function startJob(start, stop, n_steps) {
    $.post("batch_run/", JSON.stringify({
        'jobs': COMBINATIONS.slice(start, stop + 1), 'static_settings': STATIC_SETTINGS,
        'n_steps': n_steps
        }),
           function (data, success) {
               var i = 0;
               var res = [];
               res = data['results'];

               for (i = 0; i < res.length; i++) {
                   RESULTS[res[i][0]][res[i][1]][res[i][2]] = res[i][9];
               }
               
               N_JOBS -= 1;
               $("#countdown").val(N_JOBS);
               if (N_JOBS == 0) {
                   $("#countdown").remove();
                   drawCharts();
                   for (i = 0; i < RESULTS.length; i++) {
                       CHARTS.push(new Chart(i, $("[chartid=" + i + "]")));
                       CHARTS[i].draw(0, 2);
                   }
               }
           });
}

/* 
 * Sets up page for charts, divides study into suitable parts and 
 * starts the study. 
 */
function runStudy() {
    var limit = 100000, start = 0, stop = 0, n_charts=0, i=0, n_steps=0, interval=0;
    /* Get batch study combos and static settings. */
    getCombinations();
    getStaticSettings();
    
    /* Steps per run. */
    n_steps = parseInt($("#stats_steps input")[0].value);
    /* Number of charts. */
    n_charts = STUDY_SETTINGS.length;
    
    /* Set up area for charts with waiting screen. */
    $("div#description")[0].remove();
    $("div#settings")[0].remove();
    $("div#batch_study").append(
        "<div id='charts'><input type='number' id='countdown' value=0 /> </div>");

    /* Divide and start jobs. */
    start = 0;
    interval = limit / n_steps - 1; // Combinations per job
    if (interval < 0) interval = 0;
    console.log(start, stop, interval, N_JOBS);
    while (stop < COMBINATIONS.length) {
        stop = start + 1 + interval;
        console.log(start, stop, N_JOBS);
        startJob(start, stop, n_steps);
        N_JOBS += 1;
        $("#countdown").val(N_JOBS);
        start = stop;
    }

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

/* 
 * Redraws chart with axes from drop down menus.
 */
function updateChart(element) {
    var chart_id = 0, i = 0, x=0, y=0;

    chart_id = $(element).parents(".chart").attr("chartid");
    x = $(element).parents(".drop_down").find("#x-axis select").val();
    y = $(element).parents(".drop_down").find("#y-axis select").val();
    CHARTS[chart_id].draw(x, y);

}
