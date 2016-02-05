/* Functions for updating HTML setting list. */

/*
 * Calculates and updates the statistics of the batch study.
 */
function updateStats() {
    var tr_elements = {};
    var n_steps = 0, tot_steps = 0, combos = 0, tot_combos = 0, sweep_combos = 0;

    /* Get sweep setting. */
    tr_elements = $("table#settings tbody tr");
    for (i = 0; i < tr_elements.length; i++) {
        if ($(tr_elements[i]).find("td#setting_default input")[0].checked) {
            sweep_combos = calculateCombos(
                parseInt($(tr_elements[i]).find("td#setting_srt input")[0].value),
                parseInt($(tr_elements[i]).find("td#setting_end input")[0].value),
                parseInt($(tr_elements[i]).find("td#setting_int input")[0].value)).length;
        }
    }

    n_steps = parseInt($("#stats_steps input").val());
    /* Get all included batch run settings. */
    for (i = 0; i < tr_elements.length; i++) {
        /* If setting is included and not the sweep setting. */
        if ($(tr_elements[i]).find("td#setting_included input")[0].checked &&
            !($(tr_elements[i]).find("td#setting_default input")[0].checked)) {
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
        tr_element.find("td#setting_srt").append("<input type='number' min='0' class='setting_include' value='" +
            tr_element.find("td#setting_val input")[0].value + "'  min='0' onchange='updateCombos(this);' />");
        tr_element.find("td#setting_end").append("<input type='number' min='0' class='setting_include' value='" +
            tr_element.find("td#setting_val input")[0].value + "'  min='0' onchange='updateCombos(this);' />");
        tr_element.find("td#setting_int").append("<input type='number' min='0' class='setting_include' value='0' " +
            "onchange='updateCombos(this);' />");
        tr_element.find("td#values_inc").append("<input type='text' class='setting_include' " +
            " value='" + tr_element.find("td#setting_val input")[0].value + "' disabled/>");
    }
        /* Remove input boxes if they exist. */
    else if (!tr_element.find("td#setting_default input")[0].checked) {
        tr_element.find("input.setting_include").remove();
    }
    updateStats();
}
/*
 * Calculates and shows which values of the setting will be included in the study.
 * Also updates statistics of batch study.
 */
function updateCombos(element) {
    var tr_element = {}
    var combos = [];
    var i = 1;

    /* Find setting tr element of setting row and calculate combos. */
    tr_element = $(element).parents("tr");
    combos = calculateCombos(
        parseInt(tr_element.find("td#setting_srt input")[0].value),
        parseInt(tr_element.find("td#setting_end input")[0].value),
        parseInt(tr_element.find("td#setting_int input")[0].value));

    /* Limit length of string shown in input element.*/
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
 * Sets setting as default, i.e. will be swept over for all combinations.
 * Only one setting can be default.
 */
function setDefaultSetting(element) {
    var tr_element = {};

    /* If setting set as default. */
    if (element.checked) {
        tr_element = $(element).parents("tr");
        /* Set other default setting checkboxes to disabled.*/
        $("td#setting_default input[type=checkbox]").attr("disabled", true);
        $(element).attr("disabled", false);
        /* Check and disable setting included checkbox.*/
        tr_element.find("#setting_included input").attr("checked", true);
        tr_element.find("#setting_included input").attr("disabled", true);
        /* Activate setting start, end, interval inputs etc. */
        tr_element.css('background', "#AA0000");
        includeSetting(element);
    }
        /* If setting removed as default. */
    else {
        tr_element = $(element).parents("tr");
        /* Set other default setting checkboxes to enabled.*/
        $("td#setting_default input[type=checkbox]").attr("disabled", false);
        /* Uncheck and enable setting included checkbox.*/
        tr_element.find("#setting_included input").attr("checked", false);
        tr_element.find("#setting_included input").attr("disabled", false);
        /* Remove setting start, end, interval inputs etc. */
        tr_element.css('background', "");
        includeSetting(element);
    }
}