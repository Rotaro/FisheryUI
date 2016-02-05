from django.forms import modelformset_factory, modelform_factory
from django.shortcuts import render

from fisheryui.views import views_support
from fisheryui import models
from fisheryui import forms


def edit_settings(request):
    """View for editing session fishery simulation settings.
    """
    
    #if new session (visitor)
    session_obj = views_support.create_settings(request)
    
    #setup forms
    #formsets in two parts - nonlist settings and list settings (which can be added / deleted)
    SettingValueFormSet = modelformset_factory(
        models.SettingValueSession, form=forms.SettingValueForm, formset=forms.SettingValueFormset, 
        extra=0)
    SettingValueListFormSet = modelformset_factory(
        models.SettingValueSession, form=forms.SettingValueForm, formset=forms.SettingValueFormset, 
        extra=2, can_delete=True)

    #update session settings based on form
    if request.method == 'POST':
        formset_nodelete = SettingValueFormSet(request.POST, request.FILES, prefix="nodelete")
        if formset_nodelete.is_valid():
            formset_nodelete.save()
            formset_nodelete = SettingValueFormSet(
            queryset=models.SettingValueSession.objects.exclude(setting_id__name__contains = "consumption")
                .filter(session_id=session_obj), prefix='nodelete')
        formset_delete = SettingValueListFormSet(request.POST, request.FILES, prefix="delete")
        if formset_delete.is_valid():
            #make sure the first index of the setting lists aren't deleted
            for form in formset_delete:
                if "index" in form.cleaned_data and int(form.cleaned_data["index"]) == 0:
                    form.cleaned_data["DELETE"] = False
            formset_delete.save()
            formset_delete = SettingValueListFormSet(
            queryset=models.SettingValueSession.objects.filter(setting_id__name__contains = "consumption")
                .filter(session_id=session_obj), prefix='delete')
    
    #populate forms with session data
    else:
        formset_nodelete = SettingValueFormSet(
            queryset=models.SettingValueSession.objects.exclude(setting_id__name__contains = "consumption")
            .filter(session_id=session_obj), prefix='nodelete')
        formset_delete = SettingValueListFormSet(
            queryset=models.SettingValueSession.objects.filter(setting_id__name__contains = "consumption")
            .filter(session_id=session_obj), prefix='delete')
        
    return render(request, './fisheryui/edit_settings.html', 
                  {'formset_nodelete' : formset_nodelete, 'formset_delete' : formset_delete})
