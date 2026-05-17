FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV DJANGO_SETTINGS_MODULE=config.settings
RUN python manage.py collectstatic --noinput 2>/dev/null || true
EXPOSE 8100
CMD ["gunicorn", "config.wsgi:application", "-b", "0.0.0.0:8100", "--workers", "2"]
