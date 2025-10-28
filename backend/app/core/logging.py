import logging
from logging.handlers import RotatingFileHandler

def configure_logging():
    fmt = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    logging.basicConfig(level=logging.INFO, format=fmt)

    # Optional rotating file log
    fh = RotatingFileHandler("app.log", maxBytes=2_000_000, backupCount=2)
    fh.setFormatter(logging.Formatter(fmt))
    logging.getLogger().addHandler(fh)
