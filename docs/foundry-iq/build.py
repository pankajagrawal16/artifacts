"""Bundle the portal presentation, source-slide captures and libraries into one offline HTML file."""

import base64
import json
import subprocess
from pathlib import Path

import requests
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parent
CACHE = ROOT / ".cache"
SLIDES = {6: (30, "Foundry IQ Knowledge Bases"),
          9: (52, "Foundry IQ and Azure AI Search"),
          17: (52, "Data Preparation"),
          21: (30, "Knowledge Base as MCP server")}


def build() -> None:
    assets = ROOT / "assets"
    assets.mkdir(exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    for number, (left, _) in SLIDES.items():
        image = assets / f"slide-{number:02d}.jpg"
        capture = CACHE / f"slide-{number:02d}-view.png"
        if not image.exists():
            if not capture.exists():
                raise FileNotFoundError(f"Missing source slide {number}: capture from the signed-in deck viewer.")
            subprocess.run(["sips", "--cropOffset", "72", str(left), "--cropToHeightWidth", "900", "1600",
                            "--setProperty", "format", "jpeg", "--setProperty", "formatOptions", "87",
                            str(capture), "--out", str(image)], check=True, capture_output=True)
    soup = BeautifulSoup((ROOT / "source.html").read_text(), "html.parser")
    for script in soup.select("script[src]"):
        cache = CACHE / f'{script["id"]}.js'
        if not cache.exists():
            response = requests.get(script["src"], timeout=60)
            response.raise_for_status()
            cache.write_bytes(response.content)
        library = cache.read_text()
        if len(library) < 1000:
            raise ValueError(f"Invalid library response: {cache.name}")
        script["data-original-src"] = script["src"]
        del script["src"]
        script.string = library.replace("</script", "<\\/script")
    for image in soup.select("img[src]"):
        source = image["src"]
        image["data-original-src"] = source
        image["src"] = "data:image/jpeg;base64," + base64.b64encode((ROOT / source).read_bytes()).decode()
    output = ROOT / "index.html"
    output.write_text(str(soup))
    validation = BeautifulSoup(output.read_text(), "html.parser")
    if validation.select("script[src], link[rel=stylesheet], img[src^=http]"):
        raise ValueError("Offline bundle contains external runtime assets.")
    if len(validation.select("#slide-assets img[src^='data:image']")) != len(SLIDES):
        raise ValueError("Missing embedded source-slide images.")
    metadata = {"source_title": "The IQ Series: Foundry IQ", "source_file": "IQSeries-FoundryIQ-ForSharing.pptx",
                "discovery": "WorkIQ slide analysis; private sharing links intentionally omitted",
                "image_capture": "Read-only PowerPoint Online viewer, 28 October 2026",
                "slides": [{"number": number, "title": settings[1]} for number, settings in SLIDES.items()],
                "output": output.name, "bytes": output.stat().st_size, "external_runtime_assets": 0}
    (assets / "source.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    build()