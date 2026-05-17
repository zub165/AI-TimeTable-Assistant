from django.db import models


class ActivityRecord(models.Model):
    name = models.CharField(max_length=200)
    duration_hours = models.FloatField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    activity_date = models.DateField()
    category = models.CharField(max_length=50, blank=True, default='general')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_time']

    def __str__(self):
        return f'{self.name} ({self.duration_hours:.2f}h)'


class ActiveSession(models.Model):
    name = models.CharField(max_length=200, unique=True)
    start_time = models.DateTimeField()
    category = models.CharField(max_length=50, blank=True, default='general')

    def __str__(self):
        return f'{self.name} (active)'


class DaySchedule(models.Model):
    """Single-row schedule per device/client key."""
    client_id = models.CharField(max_length=64, unique=True, default='default')
    sleep = models.FloatField(default=8)
    work = models.FloatField(default=8)
    eat = models.FloatField(default=1.5)
    exercise = models.FloatField(default=1)
    prayer = models.FloatField(default=0.5)
    read = models.FloatField(default=1)
    entertainment = models.FloatField(default=2)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Schedule ({self.client_id})'
