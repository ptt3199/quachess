import json
from pathlib import Path

from app.main import app


def generate_openapi():
    openapi_schema = app.openapi()

    # Save to root or frontend directory
    output_path = Path(__file__).parent.parent / "frontend" / "openapi.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2)
    print(f"OpenAPI schema generated at: {output_path}")


if __name__ == "__main__":
    generate_openapi()
