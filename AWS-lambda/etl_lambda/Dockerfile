# Dockerfile  (arm64, AWS Lambda base)
FROM public.ecr.aws/lambda/python:3.12-arm64

# (optional) speed up pip
ENV PIP_NO_CACHE_DIR=1

# Install deps into Lambda task root
COPY requirements.txt .
RUN pip3 install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copy your code
COPY etl.py app.py ${LAMBDA_TASK_ROOT}/

# Lambda entry point: module.function
CMD ["app.handler"]
