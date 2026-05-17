from django.urls import path

from . import views

urlpatterns = [
    path('health/', views.health),
    path('activities/', views.ActivityListView.as_view()),
    path('activities/start/', views.ActivityStartView.as_view()),
    path('activities/stop/', views.ActivityStopView.as_view()),
    path('schedule/', views.ScheduleView.as_view()),
]
