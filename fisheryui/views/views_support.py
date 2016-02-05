from fisheryui import models
import fishery

#List settings
SETTINGS_LIST = ["vegetation_consumption", "fish_consumption"]
#Order of settings, used to make sure settings views always have the same order

def get_settings_list_indices():
    """Indices of list settings in Django model database.
    """
    return [models.SettingID.objects.get(name=x).id for x in SETTINGS_LIST]

def get_settings_default():
    """Retrieves default fishery simulation settings as a dictionary.

    Returns
    ----------
    settings : dict
        Dictionary of default fishery simulation settings.
    """

    settings = {}
    for setting in fishery.MPyGetFisherySettingOrder():
        setting_vals = models.SettingValue.as_list.get(setting)
        if (len(setting_vals) == 1 and setting not in SETTINGS_LIST):
            settings[setting] = setting_vals[0]
        else:
            settings[setting] = setting_vals

    return settings

def get_settings_session(session):
    """Retrieves session fishery simulation settings as a dictionary.

    Returns
    ----------
    settings : dict
        Dictionary of session fishery simulation settings.
    """
    #get all settings for session
    sess_settingvalues = models.SettingValueSession.objects.filter(session_id=session)
    
    settings = {}
    for setting in fishery.MPyGetFisherySettingOrder():
        #get specific setting for session
        setting_vals = sess_settingvalues.filter(
            setting_id=models.SettingID.objects.get(name=setting).id)
        #convert to list
        setting_vals = [sett.value for sett in setting_vals]
        if (len(setting_vals) == 1 and setting not in SETTINGS_LIST):
            settings[setting] = setting_vals[0]
        else:
            settings[setting] = setting_vals
    return settings
 
def create_settings(request):
    """Creates default settings for new session / visitor.

    Returns
    ----------
    session_obj : :class:`models.SettingValueSession`
        Session model instance.
    """

    if not request.session.exists(request.session.session_key):
        request.session.create() 
    session_obj = models.Session.objects.get(session_key=request.session.session_key)
    #if no settings for session in database, create new ones
    if len(models.SettingValueSession.objects.filter(session_id=session_obj)) == 0:
        models.SettingValueSession.cust.create_settings(session_obj)
    
    return session_obj