/* Functions for updating batch study HTML ui. Requires batch_study.js. */

/*
 * Calculates and updates the statistics of the batch study.
 */
function updateStats() {
    var tr_elements = {};
    var n_steps = 0, tot_steps = 0, combos = 0, tot_combos = 0, sweep_combos = 0;

    /* Get sweep setting. */
    tr_elements = $("table#settings tbody tr");
    for (i = 0; i < tr_elements.length; i++) {
        if ($(tr_elements[i]).find("td#setting_sweep input")[0].checked) {
            sweep_combos = calculateCombos(
                parseInt($(tr_elements[i]).find("td#setting_srt input")[0].value),
                parseInt($(tr_elements[i]).find("td#setting_end input")[0].value),
                parseInt($(tr_elements[i]).find("td#setting_int input")[0].value)).length;
        }
    }

    n_steps = parseInt($("#stats_steps input").val());
    /* Get all included batch study settings. */
    for (i = 0; i < tr_elements.length; i++) {
        /* If setting is included and not the sweep setting. */
        if ($(tr_elements[i]).find("td#setting_included input")[0].checked &&
            !($(tr_elements[i]).find("td#setting_sweep input")[0].checked)) {
            /* Calculate combinations for setting.*/
            combos = calculateCombos(
                parseInt($(tr_elements[i]).find("td#setting_srt input")[0].value),
                parseInt($(tr_elements[i]).find("td#setting_end input")[0].value),
                parseInt($(tr_elements[i]).find("td#setting_int input")[0].value)).length;
            /* Calculate total amount of combinations. */
            tot_combos += combos * sweep_combos;
        }
    }
    /* Total amount of steps. */
    tot_steps = n_steps * tot_combos;
    $("#stats_combos input").val(tot_combos);
    $("#stats_tot_steps input").val(tot_steps);
    // Simulating 1000000 steps takes about 8 seconds
    $("#stats_est_time input").val(tot_steps / 1000000 * 8);
}
/*
 * Creates / removes input elements for setting.
 */
function includeSetting(element) {
    var tr_element;
    /* Get row which triggered event. */
    tr_element = $(element).parents("tr");
    /* Add input boxes to setting row if they don't exist. */
    if (tr_element.find("input.setting_include").length == 0) {
        /* Start element. */ 
        tr_element.find("td#setting_srt").append(
            "<input type='number' min='0' class='setting_include' value='" +
            tr_element.find("td#setting_val input")[0].value +
            "'  min='0' onchange='updateCombos(this);' />");
        /* End element. */
        tr_element.find("td#setting_end").append(
            "<input type='number' min='0' class='setting_include' value='" +
            tr_element.find("td#setting_val input")[0].value +
            "'  min='0' onchange='updateCombos(this);' />");
        /* Interval element. */
        tr_element.find("td#setting_int").append(
            "<input type='number' min='0' class='setting_include' value='0' " +
            "onchange='updateCombos(this);' />");
        /* Combinations element. */
        tr_element.find("td#values_inc").append(
            "<input type='text' class='setting_include' " +
            " value='" + tr_element.find("td#setting_val input")[0].value +
            "' disabled/>");
    }
    /* Remove input boxes if they exist. */
    else if (!tr_element.find("td#setting_sweep input")[0].checked) {
        tr_element.find("input.setting_include").remove();
    }
    updateStats();
}
/*
 * Calculates and shows which values of the setting will be included in the 
 * study. Also updates statistics of batch study.
 */
function updateCombos(element) {
    var tr_element = {}
    var combos = [];
    var i = 1;

    /* Find tr element of setting row and calculate combos. */
    tr_element = $(element).parents("tr");
    combos = calculateCombos(
        parseInt(tr_element.find("td#setting_srt input")[0].value),
        parseInt(tr_element.find("td#setting_end input")[0].value),
        parseInt(tr_element.find("td#setting_int input")[0].value));

    /* Limit length of string shown.*/
    if (combos.toString().length >= 32) {
        i = 0;
        while (combos.slice(0, i).toString().length < 32)
            i++;
        combos[i - 1] = "..";
        tr_element.find("td#values_inc input").val(combos.slice(0, i).toString());
    }
    else
        tr_element.find("td#values_inc input").val(combos.toString());

    /* Update number of total steps. */
    updateStats();
}
/*
 * Sets or removes setting as sweep. Only one setting can be sweep.
 * Sweep = setting will be swept over for every study combination.
 */
function setSweepSetting(element) {
    var tr_element = {};

    tr_element = $(element).parents("tr");
    /* If setting set as sweep. */
    if (element.checked) {
        /* Set other sweep setting checkboxes to disabled.*/
        $("td#setting_sweep input").attr("disabled", true);
        $(element).attr("disabled", false);
        /* Check and disable setting included checkbox.*/
        tr_element.find("#setting_included input").attr("checked", true);
        tr_element.find("#setting_included input").attr("disabled", true);
        /* Activate setting start, end, interval inputs etc. */
        tr_element.css("background", "#AA0000");
        includeSetting(element);
    }
    /* If setting removed as sweep. */
    else {
        /* Enable other sweep checkboxes.*/
        $("td#setting_sweep input").attr("disabled", false);
        /* Uncheck and enable setting included checkbox.*/
        tr_element.find("#setting_included input").attr("checked", false);
        tr_element.find("#setting_included input").attr("disabled", false);
        /* Remove setting start, end, interval inputs etc. */
        tr_element.css("background", "");
        includeSetting(element);
    }
}

/* 
 * Creates elements for charts.
 *
 */
function drawCharts(n) {
    var n, n_x, n_y, i, chart_width, chart_height;

    n_x = Math.ceil(Math.sqrt(n)); // charts per row
    n_y = Math.ceil(n / n_x); // rows of charts

    // dimensions of chart area
    $("div#charts").width($("#batch_study").width());
    $("div#charts").height($(window).height() * 0.88);
    // create chart elements and their children
    for (i = 0; i < n; i++) {
        $("div#charts").append(
            '<div class="chart" chartid=' + i.toString() + '>        \
             <div class="chart_area"></div>                          \
             <div class="drop_down">                                 \
             <div id="x-axis"><span>X-axis: </span><select/></div>   \
             <div id="y-axis"><span>Y-axis: </span><select/></div>   \
             </div></div>');
        if (i + 1 == n_x) { 
            $("div#charts").append('<div class="clear" />'); // row break
        }
    }
    // dimensions of charts, taking into account, border, padding, etc.
    chart_width = $("div#charts").width() / n_x - 8;
    chart_height = $("div#charts").height() / n_y - 14;
    $("div.chart").css("width", chart_width);
    $("div.chart").css("height", chart_height);
    // make sure dropdowns and their text are of suitable sizes 
    $(".drop_down div").css("height", (chart_height * 0.15 - 3) * 0.5);
    $(".drop_down").css("font-size", (chart_height * 0.15 - 3) * 0.5 * 0.43);
    $(".drop_down select").css("font-size", (chart_height * 0.15 - 3) * 0.5 * 0.43);
}
/* 
 * Redraws chart with axes set in drop down menus.
 */
function updateChart(element) {
    var chart_id = 0, i = 0, x = 0, y = 0;

    chart_id = $(element).parents(".chart").attr("chartid");
    x = parseInt($(element).parents(".drop_down").find("#x-axis select").val());
    y = parseInt($(element).parents(".drop_down").find("#y-axis select").val());
    CHARTS[chart_id].draw(x, y);

}