FROM python:3.12-slim AS base

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY *.py ./
COPY routers ./routers
COPY services ./services
COPY data ./data

FROM base AS test
COPY requirements-test.txt .
RUN pip install --no-cache-dir -r requirements-test.txt
COPY tests ./tests
CMD ["python", "-m", "pytest", "tests/", "-q"]

FROM base AS runtime
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
