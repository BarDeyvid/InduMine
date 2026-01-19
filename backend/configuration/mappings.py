import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))



# Import models
from models.products import *

# ============================================================================
# CATEGORY MAPPING CONFIGURATION
# ============================================================================
CATEGORY_CONFIG = {
    "building-infrastructure": {
        "model": BuildingInfrastructure,
        "name": "Building Infrastructure"
    },
    "coatings-and-varnishes": {
        "model": CoatingsAndVarnishes,
        "name": "Coatings & Varnishes"
    },
    "critical-power": {
        "model": CriticalPower,
        "name": "Critical Power"
    },
    "digital-solutions": {
        "model": DigitalSolutions,
        "name": "Digital Solutions"
    },
    "digital-solutions-and-smart-grid": {
        "model": DigitalSolutionsSmartGrid,
        "name": "Digital Solutions & Smart Grid"
    },
    "electric-motors": {
        "model": ElectricMotors,
        "name": "Electric Motors"
    },
    "generation-transmission": {
        "model": GenerationTransmission,
        "name": "Generation, Transmission & Distribution"
    },
    "industrial-automation": {
        "model": IndustrialAutomation,
        "name": "Industrial Automation"
    },
    "safety-sensors": {
        "model": SafetySensors,
        "name": "Safety, Sensors & Power Supply"
    }
}