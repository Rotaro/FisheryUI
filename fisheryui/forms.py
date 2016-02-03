"""Definition of forms in fisheryui.
"""

from django.forms import ModelForm, BaseModelFormSet, ValidationError
from django.forms import IntegerField, DecimalField, CharField, ModelChoiceField
from django.forms.extras.widgets import SelectDateWidget, Select

from . import models

import fishery

#List of all settings
ALL_SETTINGS = fishery.MPyGetFisherySettingOrder()


class SettingIDField(CharField):
    """Custom CharField for using SettingID in forms. Converts between string
    and SettingID instance.
    """

    def to_python(self, value):
        if not value:
            return 
        try:
            return models.SettingID.objects.get(name = value)
        except models.DoesNotExist:
            return 

class SettingValueForm(ModelForm):
    """Form for editing fishery simulation settings.
    """
    def __init__(self, *args, **kwargs):
        super(ModelForm, self).__init__(*args, **kwargs)
        #make setting_id show the name of the setting, make both setting name and 
        #index readonly
        if "setting_id" in self.initial:
            self.fields["index"].widget.attrs["readonly"] = "readonly"
            self.initial["setting_id"] = \
                models.SettingID.objects.get(id = self.initial["setting_id"]).name
        #make it possible to only add settings which are actually lists
        else:
            self.fields["setting_id"] = ModelChoiceField(
                queryset=models.SettingID.objects.filter(name__contains = "consumption"))

    setting_id = SettingIDField(help_text="Setting name.")
    index = CharField(help_text = "0 if not a list, index of list  otherwise.")
    value = IntegerField(min_value = 0, help_text = "Value of setting.")

    class Meta:
        model = models.SettingValue
        fields = ("setting_id", "index", "value")


class SettingValueFormset(BaseModelFormSet):
    """Formset class for validating SettingValue data.
    """

    def clean(self):
        """Checks that all setting lists contain all indices."""

        settings_list = ALL_SETTINGS.copy()
        settings_found = {}
        #collect indices of settings
        for form in self.forms:
            if "setting_id" in form.cleaned_data:
                setting_name = form.cleaned_data["setting_id"].name
                if setting_name not in settings_found:
                    settings_found[setting_name] = [int(form.cleaned_data["index"])]
                else:
                    settings_found[setting_name].append(int(form.cleaned_data["index"]))
        #check  indices of settings
        for setting in settings_found:
            for i in range(0, len(settings_found[setting])):
                if i not in settings_found[setting]:
                    raise ValidationError("Missing index %d from %s" % (i, setting))

class SettingValueSessionFormset(BaseModelFormSet):
    """Formset class for validating SettingValueSession data.
    """

    def __init__(self, *args, **kwargs):
        super(SettingValueSessionFormset, self).__init__(*args, **kwargs)
        self.queryset = models.SettingValueSession.objects.filter(index=2)

    def clean(self):
        """Checks that all setting lists contain all indices."""

        settings_list = ALL_SETTINGS.copy()
        settings_found = {}
        #collect indices of settings
        for form in self.forms:
            if "setting_id" in form.cleaned_data:
                setting_name = form.cleaned_data["setting_id"].name
                if setting_name not in settings_found:
                    settings_found[setting_name] = [int(form.cleaned_data["index"])]
                else:
                    settings_found[setting_name].append(int(form.cleaned_data["index"]))
        #check  indices of settings
        for setting in settings_found:
            for i in range(0, len(settings_found[setting])):
                if i not in settings_found[setting]:
                    raise ValidationError("Missing index %d from %s" % (i, setting))

