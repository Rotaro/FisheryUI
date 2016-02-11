/* GLOBAL VARIABLES FOR RUNNING BATCH JOB (maybe replace later with something more appopriate. */

var N_JOBS = 0; // Used as progress tracker while batch study is running.
var SWEEP_SETTING = {}; // Stores the sweep setting, i.e. setting which is swept for each combination.
var STUDY_SETTINGS = []; // Stores the settings which are varied over during the study.
var CHARTS = []; // Stores chart instances after study run.
var LIMIT = 500000; // Maximum number of simulation steps per server request.

/*
 * Class for storing study run setting information.
 */
function StudySetting(setting_id, index, combos) {
    var i = 0;
    this.setting_id = setting_id;
    this.index = index;
    this.axis = [];
    this.results = [];
    
    for (i = 0; i < combos.length ; i++)
        this.results.push([]);

    this.axis = combos.slice();
}
/*
 * Class for storing and drawing batch study results.
 */
function Chart(chart_element, std_set, swp_set) {
    this.chart_element = chart_element;
    this.std_set = std_set;

    var dropdown = {};
    
    // Possible axes for chart
    this.headers = ["Fish Population", "Fish Yield", "Vegetation",
                    "Fish Pop Std Dev", "Fish Yield Std Dev",
                    "Vegetation Std Dev"];

    // Set drop down options.
    dropdowns = $(chart_element).find("div.drop_down select");
    for (i = 0; i < dropdowns.length; i++) {
        $(dropdowns[i]).attr("onchange", "updateChart(this);")
        $(dropdowns[i]).append("<option value='0'>" + swp_set.setting_id + " - "
            + swp_set.index + "</option>");
        for (j = 0; j < this.headers.length; j++) {
            $(dropdowns[i]).append("<option value='" + (j + 1).toString() + "'>" +
                this.headers[j] + "</option>");
        }
    }
    // Set starting axes
    $($(dropdowns[0]).find("option[value=0]")[0]).attr("selected", "selected");
    $($(dropdowns[1]).find("option[value=2]")[0]).attr("selected", "selected");

    /*
     * Draws chart with x as x-axis and y as y-axis.
     * x, y - integer where:
     *        0 - Default Setting, 1 - Fish Pop, 2 - Fish Yield,
     *        3 - Vegetation, 4 - Fish Pop StdDev, 5 - Fish Yield Std Dev,
     *        6 - Vegetation Std Dev.
     */
    this.draw = function (x, y) {
        /* Need to reformat data for Google Visualization to the following:
         * [ ["X-value", "First Y", "Second Y"],
         *   [0        , 1        , null      ],
         *   [1        , null     , 2         ]]
         * The use of nulls can be avoided if the x-axis values are the
         * same for all curves, but this is only the case for the sweep 
         * setting.
         */
        var data, i = 0, j = 0, k = 0;
        var row = [], header = [];
        var chart = {};

        // Create header row (sweep setting, result type, setting value(s))
        header = [[SWEEP_SETTING.setting_id].concat(this.headers)[x]];
        for (i = 0; i < this.std_set.axis.length; i++)
            header.push(this.std_set.axis[i].toString());
        data = [header];
        // Add result rows by setting value first
        for (i = 0; i < this.std_set.axis.length; i++) {
            // Then by sweep setting value
            for (j = 0; j < SWEEP_SETTING.axis.length; j++) {
                // X-value as first column
                if (x === 0)
                    row = [SWEEP_SETTING.axis[j]];
                else
                    row = [this.std_set.results[i][j][x - 1]];
                // Nulls for each setting value column
                for (k = 0; k < this.std_set.axis.length; k++) row.push(null);
                // Set y-value for current setting value column (i)
                if (y === 0)
                    row[i + 1] = SWEEP_SETTING.axis[j];
                else
                    row[i + 1] = this.std_set.results[i][j][y - 1];

                data.push(row);
            }
        }
        data = google.visualization.arrayToDataTable(data);
        // Sort data according to x-axis data
        data.sort([{ column: 0 }]);

        var options = {
            title: this.std_set.setting_id + " - " + this.std_set.index,
            curveType: 'function',
            interpolateNulls: true,
            legend: { position: 'top' },
            hAxes: {
                0: {title: [SWEEP_SETTING.setting_id].concat(this.headers)[x]}
            },
            vAxes: {
                0: {title: [SWEEP_SETTING.setting_id].concat(this.headers)[y]}
            },
            pointSize: 5,
            intervals: { style: 'bars', barwidth: 1 }
        };
        chart = new google.visualization.LineChart(
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
 * global variables. Only called once both sweep setting and at least one
 * included setting are set.
 *
 * Returns list of lists, where each entry is one combination:
 * [#setting, #setting value, #sweep setting value, 
 * setting_id, setting_index, setting_value
 * sweep_setting_id, sweep_setting_index, sweep_setting_value]
 */
function getCombinations() {
    var tr_element = {}, tr_elements = {}, tr_sweep = {};
    var combinations = [], combos = [], sweep_setting = [];
    var i = 0, j = 0, k = 0, n_run = 0, combo = 0, index = 0, start = 0, end = 0, interval = 0;

    /* Reset global varibles. */
    SWEEP_SETTING = {};
    STUDY_SETTINGS = [];


    /* Find sweep setting information and create StudySetting instance. */
    tr_sweep = $("td#setting_sweep input[disabled!=disabled]").parents("tr");
    combos = calculateCombos(
        parseInt($(tr_sweep).find("td#setting_srt input")[0].value),
        parseInt($(tr_sweep).find("td#setting_end input")[0].value),
        parseInt($(tr_sweep).find("td#setting_int input")[0].value));
    SWEEP_SETTING = new StudySetting(
        tr_sweep.attr("id"),
        parseInt($(tr_sweep).find("td#setting_idx input")[0].value),
        combos);

    /* Find study setting(s) information and create StudySetting instance(s). */
    tr_elements = $("table#settings tbody").find("tr");
    for (i = 0; i < tr_elements.length; i++) {
        /* If setting included in batch study and not sweep setting */
        if ($(tr_elements[i]).find("td#setting_included input")[0].checked && 
            !($(tr_elements[i]).find("td#setting_sweep input")[0].checked)) {
            index = parseInt($(tr_elements[i]).find("td#setting_idx input")[0].value);
            combos = calculateCombos(
                parseInt($(tr_elements[i]).find("td#setting_srt input")[0].value),
                parseInt($(tr_elements[i]).find("td#setting_end input")[0].value),
                parseInt($(tr_elements[i]).find("td#setting_int input")[0].value));
            STUDY_SETTINGS.push(new StudySetting(tr_elements[i].id, index, combos));
            /* For each setting value */
            for (j = 0; j < combos.length; j++) {
                /* For each sweep setting value */ 
                for (k = 0; k < SWEEP_SETTING.axis.length; k++) {
                    STUDY_SETTINGS[n_run].results[j].push([]);
                    combinations.push(
                     [n_run, j, k,
                      tr_elements[i].id, index, parseInt(combos[j]),
                      SWEEP_SETTING.setting_id, SWEEP_SETTING.index, SWEEP_SETTING.axis[k]]);
                }
            }
            n_run += 1;
        }
    }

    return combinations;
}
/*
 * Saves static settings, i.e. default settings for a batch study, in
 * global variable STUDY_SETTINGS.
 *
 * Settings are saved as list of lists, where each entry is a 
 * static setting, i.e.:
 * [setting_id, setting_index, setting_value]
*/
function getStaticSettings() {
    var tr_elements = {};
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
    return static_settings;
}


/* 
 * AJAX call for part of batch study run. 
 *
 * On completion will decrease the global variable N_JOBS by one. Once it 
 * reaches 0, the draw function for the charts is called.
 *
 */
function startJob(combos, n_steps, static_settings) {
    $.post("batch_run/", JSON.stringify({
        'jobs': combos,
        'static_settings': static_settings,
        'n_steps': n_steps
        }),
           function (data, success) {
               var i = 0;
               var res = [];
               res = data['results'];

               for (i = 0; i < res.length; i++) {
                   STUDY_SETTINGS[res[i][0]].
                       results[res[i][1]][res[i][2]] = res[i][3];
               }
               
               N_JOBS -= 1;
               $("#countdown").val(N_JOBS);
               if (N_JOBS == 0) {
                   $("#countdown").remove();
                   drawCharts(STUDY_SETTINGS.length);
                   for (i = 0; i < STUDY_SETTINGS.length; i++) {
                       CHARTS.push(new Chart($("[chartid=" + i + "]"),
                           STUDY_SETTINGS[i], SWEEP_SETTING));
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
    var start = 0, stop = 0, i = 0, n_steps = 0, interval = 0;
    var combos = [];
    /* Get batch study combos and static settings. */
    combos = getCombinations();
    static_settings = getStaticSettings();
    
    /* Steps per run. */
    n_steps = parseInt($("#stats_steps input")[0].value);
    
    /* Set up area for charts with waiting screen. */
    $("div#description")[0].remove();
    $("div#settings")[0].remove();
    $("div#batch_study").append(
        "<div id='charts'> \
        <input type='number' id='countdown' float='left' value=0 /> \
        </div>"); 
    /* Divide and start batch study. */
    start = 0;
    interval = LIMIT / n_steps - 1; // Combinations per job
    if (interval < 0) interval = 0;
    console.log(start, stop, interval, N_JOBS);
    while (stop < combos.length) {
        stop = start + 1 + interval;
        console.log(start, stop, N_JOBS);
        startJob(combos.slice(start, stop + 1), n_steps, static_settings);
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


