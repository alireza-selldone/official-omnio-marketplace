import json
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

root = Path(__file__).resolve().parent.parent
audit = json.loads((root / ".tmp" / "catalog-media-audit.json").read_text(encoding="utf-8"))
manifest_path = root / ".tmp" / "catalog-transparent-manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
files = {
    (product["id"], asset["path"]): Path(asset["file"])
    for product in audit["products"]
    for asset in product["assets"]
}

session = new_session()
for index, item in enumerate(manifest["outputs"], start=1):
    source = files[(item["productId"], item["source"])]
    image = Image.open(source).convert("RGBA")
    cutout = remove(image, session=session, alpha_matting=False)
    alpha = cutout.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise RuntimeError(f"Background removal produced an empty image for {source}")
    subject = cutout.crop(bbox)
    subject.thumbnail((720, 720), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (1200, 1200), (0, 0, 0, 0))
    canvas.alpha_composite(subject, ((1200 - subject.width) // 2, (1200 - subject.height) // 2))
    output = Path(item["output"])
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, "PNG", optimize=True, compress_level=9)
    if index % 10 == 0:
        print(f"processed {index}/{len(manifest['outputs'])}", flush=True)

print(json.dumps({"processed": len(manifest["outputs"]), "outputDir": str(Path(manifest["outputs"][0]["output"]).parent)}))
