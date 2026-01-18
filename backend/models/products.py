import os, sys

from sqlalchemy import (
    create_engine, Column, Integer, String, Text, Boolean, JSON, 
    inspect, or_, text
)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base
# --- Product Table Models (Specific to your SQL Dump) ---
# We use a Mixin for columns that appear often, but map specific columns manually.

class ProductMixin:
    """Common fields found across most tables"""
    # Using specific Column names from your SQL dump (often with spaces)
    product_url = Column("Product URL", Text)
    # We use Product Code as a pseudo-PK for fetching details, though tables lack explicit PKs sometimes
    product_code = Column("Product Code", String(255), primary_key=True) 
    product_image = Column("Product Image", Text)
    category_name = Column("Category", Text)

# 1. Building Infrastructure
class BuildingInfrastructure(Base, ProductMixin):
    __tablename__ = "building_infrastructure"
    model = Column("Model", Text)
    rated_current = Column("Rated current, [In]", Text)

# 2. Coatings
class CoatingsAndVarnishes(Base, ProductMixin):
    __tablename__ = "coatings_and_varnishes"
    color = Column("Color", Text)
    function = Column("Function", Text)
    application = Column("Application Surface", Text)

# 3. Critical Power
class CriticalPower(Base, ProductMixin):
    __tablename__ = "critical_power"
    rated_power = Column("Rated Power", Text)
    input_voltage = Column("Input voltage", Text)

# 4. Digital Solutions
class DigitalSolutions(Base, ProductMixin):
    __tablename__ = "digital_solutions"
    type = Column("Type", Text)
    voltage = Column("Power supply voltage", Text)

# 5. Smart Grid
class DigitalSolutionsSmartGrid(Base, ProductMixin):
    __tablename__ = "digital_solutions_and_smart_grid"
    application = Column("Application", Text)
    asset = Column("Asset", Text)

# 6. Electric Motors
class ElectricMotors(Base, ProductMixin):
    __tablename__ = "electric_motors"
    frame = Column("Frame", Text)
    poles = Column("Number of Poles", Text)
    output = Column("Output", Text)
    voltage = Column("Voltage", Text)
    efficiency = Column("Efficiency @ 100%", Text)

# 7. Generation & Transmission
class GenerationTransmission(Base, ProductMixin):
    __tablename__ = "generation_transmission_and_distribution"
    power = Column("Power", Text)
    hv_voltage = Column("HV rated voltage", Text)

# 8. Industrial Automation
class IndustrialAutomation(Base, ProductMixin):
    __tablename__ = "industrial_automation"
    supply_voltage = Column("Supply voltage", Text)
    current = Column("RATED CURRENT", Text)

# 9. Safety Sensors
class SafetySensors(Base, ProductMixin):
    __tablename__ = "safety_industrial_sensors_and_power_supply"
    supply_voltage = Column("Supply voltage", Text)
    output_type = Column("Output type", Text)