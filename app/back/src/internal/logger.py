import logging
import json
from datetime import datetime
from src.internal.config import LOG_FILE_PATH


def setup_access_logger() -> logging.Logger:
    logger = logging.getLogger("fastapi_access")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    for handler in list(logger.handlers):
        logger.removeHandler(handler)
    try:
        LOG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
        handler = logging.FileHandler(LOG_FILE_PATH, encoding="utf-8")
    except (OSError, PermissionError):
        handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    return logger


ACCESS_LOGGER = setup_access_logger()


def log_failed_login(user_email: str, ip_address: str, reason: str) -> None:
    log_entry = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "event": "login_failed",
        "user": user_email,
        "ip": ip_address,
        "reason": reason,
    }
    ACCESS_LOGGER.info(json.dumps(log_entry, ensure_ascii=False))
