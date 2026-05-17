import json
from datetime import date, datetime, timedelta

from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
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
from .services import categorize, day_summary, week_stats

QUICK_STARTS = [
    'coding', 'work', 'exercise', 'prayer', 'reading',
    'meal', 'family time', 'sleep', 'meeting', 'break',
]


@api_view(['GET'])
def health(request):
    return Response({
        'status': 'ok',
        'service': 'voice-time-manager-api',
        'version': '2.0',
        'endpoints': [
            'GET /api/health/',
            'GET|DELETE /api/activities/',
            'POST /api/activities/start/',
            'POST /api/activities/stop/',
            'POST /api/activities/stop-all/',
            'POST /api/activities/manual/',
            'DELETE /api/activities/<id>/',
            'GET|PUT /api/schedule/',
            'GET /api/summary/',
            'GET /api/stats/week/',
            'GET /api/history/',
            'GET /api/export/',
            'GET /api/quick-starts/',
            'POST /api/pomodoro/start/',
            'POST /api/pomodoro/stop/',
        ],
    })


class ActivityListView(APIView):
    def get(self, request):
        day = request.query_params.get('date')
        qs = ActivityRecord.objects.all()
        if day:
            qs = qs.filter(activity_date=day)
        active = ActiveSession.objects.all()
        return Response({
            'activities': ActivityRecordSerializer(qs, many=True).data,
            'active_sessions': ActiveSessionSerializer(active, many=True).data,
        })

    def delete(self, request):
        ActivityRecord.objects.all().delete()
        ActiveSession.objects.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ActivityDetailView(APIView):
    def delete(self, request, pk):
        try:
            record = ActivityRecord.objects.get(pk=pk)
        except ActivityRecord.DoesNotExist:
            return Response({'error': 'not found'}, status=status.HTTP_404_NOT_FOUND)
        record.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ActivityStartView(APIView):
    def post(self, request):
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'error': 'name is required'}, status=status.HTTP_400_BAD_REQUEST)
        if ActiveSession.objects.filter(name=name).exists():
            return Response({'error': 'already tracking'}, status=status.HTTP_409_CONFLICT)
        cat = request.data.get('category') or categorize(name)
        session = ActiveSession.objects.create(
            name=name,
            start_time=timezone.now(),
            category=cat,
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


class ActivityStopAllView(APIView):
    def post(self, request):
        stopped = []
        for session in list(ActiveSession.objects.all()):
            end = timezone.now()
            duration = (end - session.start_time).total_seconds() / 3600
            record = ActivityRecord.objects.create(
                name=session.name,
                duration_hours=duration,
                start_time=session.start_time,
                end_time=end,
                activity_date=session.start_time.date(),
                category=session.category,
            )
            stopped.append(ActivityRecordSerializer(record).data)
            session.delete()
        return Response({'stopped': stopped, 'count': len(stopped)})


class ActivityManualView(APIView):
    """Log a completed activity block manually."""

    def post(self, request):
        name = (request.data.get('name') or '').strip()
        duration_hours = float(request.data.get('duration_hours') or 0)
        if not name or duration_hours <= 0:
            return Response(
                {'error': 'name and duration_hours (>0) required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        end = timezone.now()
        start = end - timedelta(hours=duration_hours)
        cat = request.data.get('category') or categorize(name)
        record = ActivityRecord.objects.create(
            name=name,
            duration_hours=duration_hours,
            start_time=start,
            end_time=end,
            activity_date=parse_date(request.data.get('date')) or date.today(),
            category=cat,
        )
        return Response(ActivityRecordSerializer(record).data, status=status.HTTP_201_CREATED)


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


class SummaryView(APIView):
    def get(self, request):
        d = parse_date(request.query_params.get('date')) or date.today()
        client_id = request.query_params.get('client_id', 'default')
        return Response(day_summary(d, client_id))


class WeekStatsView(APIView):
    def get(self, request):
        d = parse_date(request.query_params.get('end')) or date.today()
        return Response(week_stats(d))


class HistoryView(APIView):
    def get(self, request):
        from_date = parse_date(request.query_params.get('from'))
        to_date = parse_date(request.query_params.get('to')) or date.today()
        if not from_date:
            from_date = to_date - timedelta(days=30)
        records = ActivityRecord.objects.filter(
            activity_date__gte=from_date,
            activity_date__lte=to_date,
        )
        return Response({
            'from': str(from_date),
            'to': str(to_date),
            'activities': ActivityRecordSerializer(records, many=True).data,
        })


class ExportView(APIView):
    def get(self, request):
        payload = {
            'exported_at': timezone.now().isoformat(),
            'activities': ActivityRecordSerializer(
                ActivityRecord.objects.all(), many=True
            ).data,
            'active_sessions': ActiveSessionSerializer(
                ActiveSession.objects.all(), many=True
            ).data,
            'schedules': DayScheduleSerializer(
                DaySchedule.objects.all(), many=True
            ).data,
        }
        if request.query_params.get('download') == '1':
            response = HttpResponse(
                json.dumps(payload, indent=2),
                content_type='application/json',
            )
            response['Content-Disposition'] = 'attachment; filename="ai-time-export.json"'
            return response
        return Response(payload)


@api_view(['GET'])
def quick_starts(request):
    return Response({'items': QUICK_STARTS})


class PomodoroStartView(APIView):
    def post(self, request):
        name = 'Pomodoro focus'
        if ActiveSession.objects.filter(name=name).exists():
            return Response({'error': 'pomodoro already running'}, status=status.HTTP_409_CONFLICT)
        session = ActiveSession.objects.create(
            name=name,
            start_time=timezone.now(),
            category='work',
        )
        client_id = request.data.get('client_id', 'default')
        schedule, _ = DaySchedule.objects.get_or_create(client_id=client_id)
        return Response({
            'session': ActiveSessionSerializer(session).data,
            'minutes': schedule.pomodoro_minutes,
        }, status=status.HTTP_201_CREATED)


class PomodoroStopView(APIView):
    def post(self, request):
        name = 'Pomodoro focus'
        try:
            session = ActiveSession.objects.get(name=name)
        except ActiveSession.DoesNotExist:
            return Response({'error': 'no pomodoro session'}, status=status.HTTP_404_NOT_FOUND)
        end = timezone.now()
        duration = (end - session.start_time).total_seconds() / 3600
        record = ActivityRecord.objects.create(
            name=name,
            duration_hours=duration,
            start_time=session.start_time,
            end_time=end,
            activity_date=session.start_time.date(),
            category='work',
        )
        session.delete()
        return Response(ActivityRecordSerializer(record).data)
