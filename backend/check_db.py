from database.db import engine
from sqlalchemy import inspect
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DB_Check")

def check_tables():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    logger.info(f"Tables in DB: {tables}")
    return tables

if __name__ == "__main__":
    check_tables()
