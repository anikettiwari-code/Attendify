"""
Logging Configuration
Enterprise-grade logging setup with structured logging
"""

import logging
import sys
from app.core.config import config

def setup_logging():
    """Configure logging for the application"""
    
    # Create logger
    logger = logging.getLogger("attendify")
    logger.setLevel(logging.INFO if not config.DEBUG_MODE else logging.DEBUG)
    
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO if not config.DEBUG_MODE else logging.DEBUG)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(console_handler)
    
    # Set SQLAlchemy logging
    if config.DEBUG_MODE:
        logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
    
    return logger

# Global logger instance
logger = setup_logging()