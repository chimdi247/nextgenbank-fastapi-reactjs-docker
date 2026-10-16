FROM python:3.13-slim
RUN pip install --no-cache-dir pytest==8.3.4 httpx==0.28.1 selenium==4.27.1
WORKDIR /tests
ENTRYPOINT ["python", "-m", "pytest"]
