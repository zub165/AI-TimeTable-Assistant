from collections import defaultdict
from datetime import date, timedelta

from django.db.models import Sum
from django.utils import timezone

from .models import ActiveSession, ActivityRecord, DaySchedule

CATEGORIES = ['sleep', 'work', 'eat', 'exercise', 'prayer', 'read', 'entertainment']


def categorize(name: str) -> str:
    n = name.lower()
    if any(k in n for k in ('sleep', 'nap')):
        return 'sleep'
    if any(k in n for k in ('work', 'code', 'job', 'study')):
        return 'work'
    if any(k in n for k in ('eat', 'food', 'meal', 'lunch', 'dinner')):
        return 'eat'
    if any(k in n for k in ('exercise', 'gym', 'run', 'walk')):
        return 'exercise'
    if any(k in n for k in ('pray', 'prayer', 'fajr', 'dhuhr')):
        return 'prayer'
    if any(k in n for k in ('read', 'book')):
        return 'read'
    return 'entertainment'


def day_summary(target_date: date, client_id: str = 'default'):
    records = ActivityRecord.objects.filter(activity_date=target_date)
    schedule, _ = DaySchedule.objects.get_or_create(client_id=client_id)
    active = ActiveSession.objects.all()

    by_category = defaultdict(float)
    for r in records:
        by_category[r.category] += r.duration_hours

    for s in active:
        elapsed = (timezone.now() - s.start_time).total_seconds() / 3600
        by_category[s.category] += elapsed

    goals = {c: getattr(schedule, c, 0) for c in CATEGORIES}
    comparison = {
        c: {
            'actual': round(by_category.get(c, 0), 2),
            'goal': goals[c],
            'diff': round(by_category.get(c, 0) - goals[c], 2),
        }
        for c in CATEGORIES
    }

    total_actual = sum(by_category.values())
    total_goal = sum(goals.values())

    return {
        'date': str(target_date),
        'total_hours_tracked': round(total_actual, 2),
        'total_hours_planned': round(total_goal, 2),
        'active_count': active.count(),
        'activity_count': records.count(),
        'by_category': comparison,
        'daily_note': schedule.daily_note or '',
    }


def week_stats(end_date: date | None = None):
    end = end_date or date.today()
    start = end - timedelta(days=6)
    rows = (
        ActivityRecord.objects.filter(activity_date__gte=start, activity_date__lte=end)
        .values('activity_date', 'category')
        .annotate(hours=Sum('duration_hours'))
    )
    days = []
    for i in range(7):
        d = start + timedelta(days=i)
        days.append({'date': str(d), 'total': 0, 'categories': {c: 0 for c in CATEGORIES}})
    day_map = {d['date']: d for d in days}
    for row in rows:
        key = str(row['activity_date'])
        if key not in day_map:
            continue
        cat = row['category']
        h = float(row['hours'] or 0)
        day_map[key]['categories'][cat] = round(h, 2)
        day_map[key]['total'] = round(day_map[key]['total'] + h, 2)
    return {'start': str(start), 'end': str(end), 'days': days}
