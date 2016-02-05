from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST
import json

from fisheryui.views import views_support

import fishery

def simulation(request):
    """View for the fishery simulation GUI. GUI/simulation updates and drawing 
    are handled by JS and AJAX-requests to other views.
    """
    
    return render(request, './fisheryui/simulation.html')

@require_POST
def create_simulation(request):
    """Creates fishery simulation using session settings. 
    Returns :class:`JsonResponse`.

    Returns
    ----------
    fishery_id : int
        Unique id for the fishery simulation.
    """
    
    session_obj = views_support.create_settings(request)
    settings = views_support.get_settings_session(session_obj)

    try:
        fishery.MPySetRNGSeed(-1)
        fishery_id = fishery.MPyCreateFishery(settings)
        print("Created fishery %d." % fishery_id)
    except Exception as e:
        print(e)
        fishery_id = -1
        print("Failed to create fishery. Check settings.")

    return JsonResponse({"fishery_id" : fishery_id})

@require_POST
def end_simulation(request):
    """Deletes fishery simulation from memory.
    
    Returns :class:`JsonResponse`.
    Request should contain the following (JSON dictionary):
    fishery_id - Fishery simulation ID
    
    Returns
    ----------
    status : int
        Success of fishery deletion.
    """
    
    if "fishery_id" in request.POST:
        fishery_id = int(request.POST["fishery_id"])
        try:
            fishery.MPyDestroyFishery(fishery_id)
            print("Destroyed fishery %d" % fishery_id)
            status = 1
        except:
            print("Failed to destroy fishery %d" % fishery_id)
            status = 0
    else:
        print("No fishery ID provided")
        status = 0

    return JsonResponse({"status":status})

@require_POST
def progress_simulation(request):
    """Progresses simulation n steps, responding with simulation status and result.
    
    Returns :class:`JsonResponse`.
    Request should contain the following (JSON dictionary):
    fishery_id - Fishery simulation ID
    steps      - Number of steps to progress simulation.
    
    Returns
    ----------
    vegetation_layer : list[int]
        List of vegetation population levels.
    fish_list : list[[int, int]]
        List of fishes in simulation. Each fish contains position and 
        population level.
    simulation_results : list[int, int, int, int, int, int, int, int, double, double]
        Results of simulation update. The results are:
        total fish population, total fishing yield, total vegetation level,
        std dev of fish population, std dev of fishing yield, std dev of vegetation level,
        steps progressed, debugging variable, fishing chance of simulation.
    """

    vegetation_layer = []
    fish_list = []
    simulation_results = []
    
    if "fishery_id" in request.POST and "steps" in request.POST:
        fishery_id = int(request.POST["fishery_id"])
        steps = int(request.POST["steps"])
        try:
            simulation_results = fishery.MPyUpdateFishery(fishery_id, steps)
            vegetation_layer = fishery.MPyGetFisheryVegetation(fishery_id)
            fish_list = fishery.MPyGetFisheryFishPopulation(fishery_id)
            print("Simulation %d progressed %d step(s)." % (fishery_id, steps))
        except:
            print("Failed to progress simulation %d." % fishery_id)
    else:
        print("No fishery ID or step amount provided.")

    return JsonResponse({"vegetation_layer" : vegetation_layer, 
                         "fish_list" : fish_list, "simulation_results" : simulation_results})