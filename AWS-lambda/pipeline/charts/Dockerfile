
# AWS Lambda base image (arm64)
FROM public.ecr.aws/lambda/python:3.12-arm64

# speed up pip
ENV PIP_NO_CACHE_DIR=1

 # prevents the warning & speeds first import
ENV MPLCONFIGDIR=/tmp/mpl    

# install deps into Lambda task root
COPY requirements.txt .
RUN pip3 install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# copy code
COPY handler.py ${LAMBDA_TASK_ROOT}/

# Lambda entry point: module.function
CMD ["handler.handler"]
