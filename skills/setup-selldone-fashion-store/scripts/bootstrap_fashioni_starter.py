#!/usr/bin/env python3
"""Materialize the latest validated Fashioni v2 tracked tree into an empty project."""

from __future__ import annotations

import argparse
import json
import subprocess
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_REPO = "https://github.com/alireza-selldone/selldone-fashioni.git"
DEFAULT_REF = "main"
DEFAULT_MIN_VERSION = 2
TEXT_SUFFIXES = {".css", ".html", ".js", ".json", ".md", ".mjs"}


class BootstrapError(RuntimeError):
    pass


def git(*args: str, cwd: Path | None = None, capture: bool = False) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=cwd,
        check=False,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )
    if result.returncode:
        detail = (result.stderr or result.stdout or "git command failed").strip()
        raise BootstrapError(detail)
    return (result.stdout or "").strip()


def assert_empty_target(target: Path) -> None:
    if not target.exists():
        target.mkdir(parents=True)
        return
    unexpected = [entry for entry in target.iterdir() if entry.name != ".git"]
    if unexpected:
        names = ", ".join(entry.name for entry in unexpected[:6])
        raise BootstrapError(
            f"target is not empty ({names}). Migrate an existing project manually; "
            "this helper never overwrites it."
        )


def load_and_validate_manifest(root: Path, minimum: int) -> dict:
    path = root / "starter.manifest.json"
    if not path.is_file():
        raise BootstrapError("starter.manifest.json is missing; this is not Fashioni v2")
    manifest = json.loads(path.read_text(encoding="utf-8"))
    version = int(manifest.get("starterVersion", 0))
    if version < minimum:
        raise BootstrapError(f"starterVersion {version} is older than required version {minimum}")

    for spec in manifest.get("requiredDesignMarkers", []):
        rel, separator, marker = str(spec).partition("::")
        if not separator or not marker:
            raise BootstrapError(f"invalid required marker in manifest: {spec}")
        source = root / rel
        if not source.is_file() or marker not in source.read_text(encoding="utf-8"):
            raise BootstrapError(f"required Fashioni v2 marker is missing: {spec}")

    searchable = []
    for base_name in ("storefront", "scripts"):
        base = root / base_name
        if base.is_dir():
            searchable.extend(
                path for path in base.rglob("*")
                if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES
            )
    for marker in manifest.get("forbiddenDesignMarkers", []):
        for source in searchable:
            if marker in source.read_text(encoding="utf-8", errors="ignore"):
                rel = source.relative_to(root).as_posix()
                raise BootstrapError(f"forbidden ruler/rail marker {marker!r} remains in {rel}")
    return manifest


def extract_tracked_tree(clone: Path, target: Path) -> None:
    archive = clone.parent / "starter.tar"
    git("archive", "--format=tar", f"--output={archive}", "HEAD", cwd=clone)
    target_root = target.resolve()
    with tarfile.open(archive, "r") as bundle:
        for member in bundle.getmembers():
            destination = (target / member.name).resolve()
            if target_root != destination and target_root not in destination.parents:
                raise BootstrapError(f"unsafe archive path: {member.name}")
            if member.issym() or member.islnk():
                raise BootstrapError(f"symbolic links are not accepted in the starter: {member.name}")
        bundle.extractall(target)


def configure_git(target: Path, repo: str, initialize: bool) -> None:
    git_dir = target / ".git"
    if not git_dir.exists() and initialize:
        git("init", "-b", "main", str(target))
    if not git_dir.exists():
        return
    existing = git("remote", capture=True, cwd=target).splitlines()
    if "upstream" not in existing:
        git("remote", "add", "upstream", repo, cwd=target)
    elif git("remote", "get-url", "upstream", capture=True, cwd=target) != repo:
        raise BootstrapError("an existing upstream remote points somewhere else; refusing to replace it")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", type=Path, help="empty project directory")
    parser.add_argument("--repo", default=DEFAULT_REPO)
    parser.add_argument("--ref", default=DEFAULT_REF)
    parser.add_argument("--min-version", type=int, default=DEFAULT_MIN_VERSION)
    parser.add_argument("--no-git-init", action="store_true")
    args = parser.parse_args()

    target = args.target.expanduser().resolve()
    assert_empty_target(target)

    with tempfile.TemporaryDirectory(prefix="fashioni-v2-") as temp_name:
        temp = Path(temp_name)
        clone = temp / "source"
        git(
            "clone",
            "--filter=blob:none",
            "--single-branch",
            "--branch",
            args.ref,
            args.repo,
            str(clone),
        )
        manifest = load_and_validate_manifest(clone, args.min_version)
        commit = git("rev-parse", "HEAD", capture=True, cwd=clone)
        extract_tracked_tree(clone, target)

    provenance = {
        "repository": args.repo,
        "ref": args.ref,
        "commit": commit,
        "starterVersion": int(manifest["starterVersion"]),
        "bootstrappedAt": datetime.now(timezone.utc).isoformat(),
    }
    (target / ".starter-provenance.json").write_text(
        json.dumps(provenance, indent=2) + "\n", encoding="utf-8"
    )
    configure_git(target, args.repo, not args.no_git_init)

    print(f"Fashioni v{provenance['starterVersion']} imported from {commit}")
    print(f"Target: {target}")
    print("Next: npm install, then npm run setup with the connected Selldone shop")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (BootstrapError, OSError, json.JSONDecodeError) as error:
        raise SystemExit(f"bootstrap failed: {error}")
