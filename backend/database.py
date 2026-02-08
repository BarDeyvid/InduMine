"""
Database Configuration Module.

This module initializes the SQLAlchemy engine, configures connection pooling,
and provides a session generator for dependency injection.
"""

import logging
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool

from config import settings

# Initialize logger for database events
logger = logging.getLogger(__name__)

# --- Engine Configuration ---
# Configures the connection to the database with a robust pooling strategy.
# pool_size: Number of connections to keep open.
# max_overflow: Number of connections to allow past pool_size during bursts.
# pool_pre_ping: Checks connection liveness before using it (prevents 500 errors on stale connections).
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_timeout=30,
    echo=settings.DEBUG,
    # MySQL specific optimizations to handle network latency and timeouts
    connect_args={
        "connect_timeout": 10,
        "read_timeout": 30,
        "write_timeout": 30
    } if "mysql" in settings.DATABASE_URL else {}
)

# --- Session Factory ---
# SessionLocal is the factory that generates new Session objects.
# We disable autocommit/autoflush to maintain manual control over transactions.
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine, 
    class_=Session
)

# --- Declarative Base ---
# Standard base class for SQLAlchemy models to inherit from.
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency generator that provides a database session.

    This function ensures that a database connection is opened for the 
    duration of a request and properly closed, committed, or rolled back 
    depending on the outcome.

    Yields:
        Session: An active SQLAlchemy local session.

    Raises:
        Exception: Re-raises any exception encountered during the transaction 
            after performing a rollback.
    """
    db = SessionLocal()
    try:
        yield db
        # Commit the transaction if no errors occurred
        db.commit()
    except Exception as e:
        # Rollback the transaction on any error to maintain data integrity
        logger.error(f"Database transaction failed: {e}")
        db.rollback()
        raise
    finally:
        # Always close the session to return the connection to the pool
        db.close()