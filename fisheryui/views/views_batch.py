from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST
import json

from fisheryui.views import views_support
from fisheryui import models

import fishery

@require_POST
def get_settings(request):
    """Returns session fishery simulation settings as JSONResponse.
    """
    
    session_obj = views_support.create_settings(request)
    settings = views_support.get_settings_session(session_obj)

    return JsonResponse({"settings" : settings})

def test_view_function(request):
    context = {'test_output_list' : [fishery.MPyGetFisherySettingOrder(), 
                                     views_support.get_settings_default()]}
    return render(request, './fisheryui/testspage.html', context)

@require_POST
def simulation_status(request):
    """ Returns the status of the simulation with the specified ID. The status
    includes vegetation layer and fish list. These are returned as a JSON 
    dictionary under the keys "vegetation_layer" and "fish_list".
    """
    
    vegetation_layer = []
    fish_list = []

    if "fishery_id" in request.POST:
        fishery_id = int(request.POST["fishery_id"])
        try:
            vegetation_layer = fishery.MPyGetFisheryVegetation(fishery_id)
            fish_list = fishery.MPyGetFisheryFishPopulation(fishery_id)
            print("Provided simulation status for %d" % fishery_id)
        except:
            print("Fishery data unavailable")
    else:
        print("No fishery ID provided")

    return JsonResponse({"vegetation_layer" : vegetation_layer, "fish_list" : fish_list})

def batch_study(request):
    """View for editing batch study settings.
    """
    
    session_obj = views_support.create_settings(request)

    #get settings
    sess_settings = views_support.get_settings_session(session_obj)
    list_sess_settings = []
    #convert to list of [settingname, index, value]
    for sett in fishery.MPyGetFisherySettingOrder():
        if not isinstance(sess_settings[sett], list):
            list_sess_settings.append([sett, 0, sess_settings[sett]])
    for sett in views_support.SETTINGS_LIST:
        for i in range(0, len(sess_settings[sett])):
            list_sess_settings.append([sett, i, sess_settings[sett][i]])

    return render(request, './fisheryui/batch_study.html', {"sess_settings": list_sess_settings})

@require_POST
def batch_run(request):
    """Runs fishery batch study. 

    Request (POST) should contain the following (JSON dictionary):
    jobs:               List of batch study combinations. Each combination
                        should consist of the following:
                        [study_index#1, study_index#2, study_index#3,
                        (for frontend)
                        setting_id, setting_index, setting_value
                        default_setting_id, default_setting_index, 
                        default_setting_value]
    static_settings:    Settings which aren't changed during study.
    n_steps:            Number of steps per study combination.

    Returns (JSON dictionary)
    ----------
    results:
        List of simulation results with combination information:
        [study_index#1, study_index#2, study_index#3, (for frontend)
         setting_id, setting_index, setting_value
         default_setting_id, default_setting_index, default_setting_value,
         [total fish population, total fishing yield, total vegetation level,
          std dev of fish population, std dev of fishing yield, 
          std dev of vegetation level, steps progressed, debugging variable, 
          fishing chance of simulation.]]
    """
    #decode data in request
    request_data = json.loads(request.body.decode("ascii"))
    jobs = request_data["jobs"]
    static_settings = request_data["static_settings"]
    n_steps = request_data["n_steps"]
    #convert settings to dictionary
    static_settings_dict = {}
    for setting in static_settings:
        if setting[0] in static_settings_dict:
            static_settings_dict[setting[0]].append(setting[2])
        elif setting[0] in views_support.SETTINGS_LIST:
            static_settings_dict[setting[0]] = [setting[2]]
        else:
            static_settings_dict[setting[0]] = setting[2]
    
    #Process batch study jobs
    simulation_results = []
    i = 0
    print(jobs)
    print(len(jobs))
    for job in jobs:
        #Store job information in results
        simulation_results.append(job)
        #Create settings dictionary for job
        tmp_settings = static_settings_dict.copy()
        #Add job setting
        if job[3] in views_support.SETTINGS_LIST:
            tmp_settings[job[3]][job[4]] = job[5]
        else:
            tmp_settings[job[3]] = job[5]
        #Add default setting
        if job[6] in views_support.SETTINGS_LIST:
            tmp_settings[job[6]][job[7]] = job[8]
        else:
            tmp_settings[job[6]] = job[8]
        fishery_id = fishery.MPyCreateFishery(tmp_settings)
        simulation_results[i].append(fishery.MPyUpdateFishery(fishery_id, n_steps))
        i = i + 1
        fishery.MPyDestroyFishery(fishery_id)

    print(simulation_results)
    return JsonResponse({'results' : simulation_results})

