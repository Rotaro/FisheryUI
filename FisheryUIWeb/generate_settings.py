# -*- coding: utf-8 -*-

import fishery
from fisheryui import models


settings = {}
settings["size_x"] = 10.0
settings["size_y"] = 10
settings["initial_vegetation_size"] = 80
settings["vegetation_level_max"] = 5
settings["vegetation_level_spread_at"] = 3
settings["vegetation_level_growth_req"] = 3
settings["soil_energy_max"] = 10
settings["soil_energy_increase_turn"] = 3
settings["vegetation_consumption"] = [0, 1, 1, 2, 2, 3]
settings["initial_fish_size"] = 10
settings["fish_level_max"] = 2
settings["fish_growth_req"] = 2
settings["fish_moves_turn"] = 5
settings["fish_consumption"] = [0, 1, 2, 3, 4, 5]
settings["random_fishes_interval"] = 30
settings["split_fishes_at_max"] = 1
settings["fishing_chance"] = 1



# Setup base settings in sqlite database 

#add setting names
i = 0
for setting_name in fishery.MPyGetFisherySettingOrder():
    try:
        sID = models.SettingID(setting_name, i)
        sID.save()
    except:
        print("exception occured")
    i = i + 1

#add setting values
for setting in models.SettingID.objects.all():
    if (isinstance(settings[setting.name], list)):
        print(setting.name)
        for i in range(0, len(settings[setting.name])):
            new_entry = models.SettingValue(setting_id = setting, index = i, value = settings[setting.name][i])
            new_entry.save()
    else:
        print(setting.id, setting.name, settings[setting.name])
        new_entry = models.SettingValue(setting_id = setting, index = 0, value = settings[setting.name])
        new_entry.save()