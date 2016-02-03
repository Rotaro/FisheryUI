"""Definition of models in fisheryui.
"""

from django.db import models
from django.contrib.sessions.models import Session

class SettingID(models.Model):
    """Stores fishery simulation setting name and a corresponding unique 
    numerical ID.
    """
    name = models.CharField(max_length = 255, unique=True)
    id = models.IntegerField(primary_key=True)

    def __str__(self):
        return self.name + "(" + str(self.id) + ")"

class SettingValueManager(models.Manager):
    """Manager for manipulating SettingValue entries.
    """
    def get(self, setting_name):
        """Returns all values for a setting as a list ordered by indices.
        """
        return [int(sett.value) for sett in 
                SettingValue.objects.filter(setting_id__name = setting_name)]

class SettingValue(models.Model):
    """Stores setting values as setting, index, value. Index is 0 for settings 
    wwhich aren't lists.
    """
    setting_id = models.ForeignKey(SettingID, on_delete=models.CASCADE)
    index = models.IntegerField()
    value = models.IntegerField()

    objects = models.Manager()
    as_list = SettingValueManager()
        
    class Meta:
        app_label = "fisheryui"
        #require one value per index
        unique_together = ('setting_id', 'index')
        #make sure indices are returned in order
        ordering = ['setting_id', 'index']

    def __str__(self):
        return str(self.setting_id) + " " + str(self.index) + \
               " " + str(self.value)

class SettingValueSessionManager(models.Manager):
    """Manager for session simulation settings.
    """
    def create_settings(self, session):
        """Creates new session settings.
        """
        for setting in SettingValue.objects.all():
            self.create(setting_id=setting.setting_id, index=setting.index, 
                        value=setting.value, session_id=session)

class SettingValueSession(models.Model):
    """Extended SettingValue with session ID. 
    
    Used for storing simulation settings for different users.

    Not a subclass due to some django errors regarding class Meta.
    """

    setting_id = models.ForeignKey(SettingID, on_delete=models.CASCADE)
    index = models.IntegerField()
    value = models.IntegerField()
    session_id = models.ForeignKey(Session, on_delete=models.CASCADE)

    objects = models.Manager()
    cust = SettingValueSessionManager()

    class Meta:
        app_label = "fisheryui"
        #require one value per index per session
        unique_together = ('setting_id', 'index', 'session_id')
        #make sure indices are returned in order
        ordering = ['session_id', 'setting_id', 'index']

    def __str__(self):
        return str(self.setting_id) + " " + str(self.index) + " " + \
               str(self.value) + " " + str(self.session_id)