from django.urls import path

from . import views

urlpatterns = [
    path('health/', views.health),
    path('activities/', views.ActivityListView.as_view()),
    path('activities/<int:pk>/', views.ActivityDetailView.as_view()),
    path('activities/start/', views.ActivityStartView.as_view()),
    path('activities/stop/', views.ActivityStopView.as_view()),
    path('activities/stop-all/', views.ActivityStopAllView.as_view()),
    path('activities/manual/', views.ActivityManualView.as_view()),
    path('schedule/', views.ScheduleView.as_view()),
    path('summary/', views.SummaryView.as_view()),
    path('stats/week/', views.WeekStatsView.as_view()),
    path('history/', views.HistoryView.as_view()),
    path('export/', views.ExportView.as_view()),
    path('quick-starts/', views.quick_starts),
    path('pomodoro/start/', views.PomodoroStartView.as_view()),
    path('pomodoro/stop/', views.PomodoroStopView.as_view()),
]
