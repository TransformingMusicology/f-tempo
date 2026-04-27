#!/usr/bin/env python3
"""
Apply skip_id_filelist to a single index file by setting notmusic=true on any
page whose id appears in the skip list.

Usage:
    apply_skip_list.py [--dry-run] <skip_id_filelist> <index_file>

Idempotent: pages that already have notmusic=true are left unchanged.
"""

import argparse
import json
import os
import sys


def apply_skip_list(
    index_path: str, skip_ids: set[str], dry_run: bool = False
) -> tuple[int, int]:
    """Set notmusic=true on pages whose id is in skip_ids.

    Returns (newly_set, already_true).
    """
    with open(index_path) as f:
        data = json.load(f)

    set_count = already_count = 0
    for book in data.get("books", {}).values():
        for page in book.get("pages", {}).values():
            if page["id"] not in skip_ids:
                continue
            if page.get("notmusic") is True:
                already_count += 1
            else:
                page["notmusic"] = True
                set_count += 1

    if set_count and not dry_run:
        with open(index_path, "w") as f:
            json.dump(data, f)

    return set_count, already_count


def load_skip_list(path: str) -> set[str]:
    with open(path) as f:
        return {line.strip() for line in f if line.strip()}


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("skip_list", help="path to skip_id_filelist")
    p.add_argument("index_file", help="path to a single index-*.json file")
    p.add_argument(
        "--dry-run", action="store_true", help="report changes but do not write"
    )
    args = p.parse_args()

    skip = load_skip_list(args.skip_list)
    set_count, already_count = apply_skip_list(
        args.index_file, skip, dry_run=args.dry_run
    )

    name = os.path.basename(args.index_file)
    action = "would set" if args.dry_run else "set"
    print(f"{name}: {action} {set_count} (already true: {already_count})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
