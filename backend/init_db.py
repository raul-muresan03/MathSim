from database import Base, engine
import models  # Register all tables before creating the schema.


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    engine.dispose()
    print("Database schema initialized.")
