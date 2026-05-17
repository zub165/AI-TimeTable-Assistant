from django.contrib import admin

from .models import ActiveSession, ActivityRecord, DaySchedule

admin.site.register(ActivityRecord)
admin.site.register(ActiveSession)
admin.site.register(DaySchedule)
