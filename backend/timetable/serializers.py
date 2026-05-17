from rest_framework import serializers

from .models import ActiveSession, ActivityRecord, DaySchedule


class ActivityRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityRecord
        fields = '__all__'


class ActiveSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActiveSession
        fields = '__all__'


class DayScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DaySchedule
        fields = [
            'client_id', 'sleep', 'work', 'eat', 'exercise',
            'prayer', 'read', 'entertainment', 'updated_at',
        ]
        read_only_fields = ['updated_at']
