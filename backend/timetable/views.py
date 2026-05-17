from datetime import date

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ActiveSession, ActivityRecord, DaySchedule
from .serializers import (
    ActiveSessionSerializer,
    ActivityRecordSerializer,
    DayScheduleSerializer,
)


def _categorize(name: str) -> str:
    n = name.lower()
    if any(k in n for k in ('sleep', 'nap')):
        return 'sleep'
    if any(k in n for k in ('work', 'code', 'job')):
        return 'work'
    if any(k in n for k in ('eat', 'food', 'meal')):
        return 'eat'
    if any(k in n for k in ('exercise', 'gym', 'run')):
        return 'exercise'
    if any(k in n for k in ('pray', 'prayer')):
        return 'prayer'
    if any(k in n for k in ('read', 'book')):
        return 'read'
    return 'entertainment'


@api_view(['GET'])
def health(request):
    return Response({'status': 'ok', 'service': 'voice-time-manager-api'})


class ActivityListView(APIView):
    def get(self, request):
        today = request.query_params.get('date') or str(date.today())
        records = ActivityRecord.objects.filter(activity_date=today)
        active = ActiveSession.objects.all()
        return Response({
            'activities': ActivityRecordSerializer(records, many=True).data,
            'active_sessions': ActiveSessionSerializer(active, many=True).data,
        })

    def delete(self, request):
        ActivityRecord.objects.all().delete()
        ActiveSession.objects.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ActivityStartView(APIView):
    def post(self, request):
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'error': 'name is required'}, status=status.HTTP_400_BAD_REQUEST)
        if ActiveSession.objects.filter(name=name).exists():
            return Response({'error': 'already tracking'}, status=status.HTTP_409_CONFLICT)
        session = ActiveSession.objects.create(
            name=name,
            start_time=timezone.now(),
            category=_categorize(name),
        )
        return Response(ActiveSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class ActivityStopView(APIView):
    def post(self, request):
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'error': 'name is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            session = ActiveSession.objects.get(name=name)
        except ActiveSession.DoesNotExist:
            return Response({'error': 'not tracking'}, status=status.HTTP_404_NOT_FOUND)

        end = timezone.now()
        duration = (end - session.start_time).total_seconds() / 3600
        record = ActivityRecord.objects.create(
            name=name,
            duration_hours=duration,
            start_time=session.start_time,
            end_time=end,
            activity_date=session.start_time.date(),
            category=session.category,
        )
        session.delete()
        return Response(ActivityRecordSerializer(record).data)


class ScheduleView(APIView):
    def get(self, request):
        client_id = request.query_params.get('client_id', 'default')
        schedule, _ = DaySchedule.objects.get_or_create(client_id=client_id)
        return Response(DayScheduleSerializer(schedule).data)

    def put(self, request):
        client_id = request.data.get('client_id', 'default')
        schedule, _ = DaySchedule.objects.get_or_create(client_id=client_id)
        serializer = DayScheduleSerializer(schedule, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
