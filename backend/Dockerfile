FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

COPY requirements.txt .
RUN python -m pip install --upgrade pip \
    && sed '/^pywin32==/d' requirements.txt > /tmp/requirements-linux.txt \
    && pip install --no-cache-dir -r /tmp/requirements-linux.txt

COPY app ./app
COPY run.py .

EXPOSE 8000

CMD ["python", "run.py", "--host", "0.0.0.0", "--no-reload"]
