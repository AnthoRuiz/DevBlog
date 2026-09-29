import os
import sys
import logging
from logging.handlers import RotatingFileHandler

LOG_DIR = "/app/logs"
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "server.log")

log_formatter = logging.Formatter(
    "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

logger = logging.getLogger("devblog")
logger.setLevel(logging.INFO)

stdout_handler = logging.StreamHandler(sys.stdout)
stdout_handler.setFormatter(log_formatter)
logger.addHandler(stdout_handler)

file_handler = RotatingFileHandler(
    LOG_FILE,
    maxBytes=5 * 1024 * 1024,
    backupCount=3,
    encoding="utf-8"
)
file_handler.setFormatter(log_formatter)
logger.addHandler(file_handler)

client_logger = logging.getLogger("devblog.client")
client_logger.setLevel(logging.INFO)
client_logger.addHandler(stdout_handler)
client_logger.addHandler(file_handler)
# It has its own handlers; without this every entry is written twice via the "devblog" logger
client_logger.propagate = False
