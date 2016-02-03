from django.conf.urls import patterns, url
import fisheryui.views

urlpatterns = patterns('',
    # Examples:
    url(r'^tests/?$', fisheryui.views.test_view_function, name="tests"),
    url(r'^settings/?$', fisheryui.views.edit_settings, name="edit_settings"),
    url(r'^simulation/?$$', fisheryui.views.simulation, name="simulation"),
    url(r'^get_settings/?$', fisheryui.views.get_settings, name="get_settings"),
    url(r'^create_simulation/?$', fisheryui.views.create_simulation, name="create_simulation"),
    url(r'^end_simulation/?$', fisheryui.views.end_simulation, name="end_simulation"),
    url(r'^simulation_status/?$', fisheryui.views.simulation_status, name="simulation_status"),
    url(r'^progress_simulation/?$', fisheryui.views.progress_simulation, name="progress_simulation"),
    url(r'^batch_study/?$', fisheryui.views.batch_study, name="batch_study"),
    url(r'^batch_run/?$', fisheryui.views.batch_run, name="batch_run"))