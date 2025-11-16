FROM public.ecr.aws/lambda/python:3.12-arm64

ENV PIP_NO_CACHE_DIR=1
ENV MPLCONFIGDIR=/tmp/mpl

COPY requirements.txt .
RUN pip3 install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

COPY handler.py ${LAMBDA_TASK_ROOT}/

ENV _HANDLER=handler.lambda_handler
CMD ["handler.lambda_handler"]