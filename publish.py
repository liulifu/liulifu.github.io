#!/usr/bin/env python3
"""
A single-entry publish script for the blog, intended to be run by AI or humans.
- Runs index generation (with optional Git operations)
- Performs quick validations (index.json validity, file existence)
- Optionally commits and pushes if --no-git is provided to generator

Usage examples:
  python publish.py                 # run generator with Git operations enabled
  python publish.py --no-git        # run generator without Git, then commit/push here
  python publish.py --dry-run       # do everything except committing/pushing
"""
from __future__ import annotations
import subprocess
import sys
import json
from pathlib import Path
from typing import Dict, List

ROOT = Path(__file__).resolve().parent
POSTS_DIR = ROOT / 'posts'
INDEX_JSON = POSTS_DIR / 'index.json'


def run(cmd: List[str], cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess:
    print(f"$ {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=str(cwd or ROOT), check=check, text=True)


def generate(no_git: bool) -> None:
    args = [sys.executable, 'generate_index.py']
    if no_git:
        args.append('--no-git')
    run(args)


def validate_index_json() -> List[str]:
    problems: List[str] = []
    try:
        with INDEX_JSON.open('r', encoding='utf-8') as f:
            data = json.load(f)
        if not isinstance(data, list):
            problems.append('index.json root is not a list')
        else:
            for i, p in enumerate(data):
                if not isinstance(p, dict):
                    problems.append(f'entry {i} is not an object')
                    continue
                for k in ['title', 'date', 'file']:
                    if k not in p:
                        problems.append(f'missing {k} in entry {i}')
                # file existence
                fp = POSTS_DIR / p.get('file', '')
                if not fp.exists():
                    problems.append(f"missing file on disk: {fp.name}")
    except Exception as e:
        problems.append(f'failed to read/parse index.json: {e}')
    return problems


def ensure_seo_files() -> List[str]:
    missing = []
    for name in ['sitemap.xml', 'robots.txt', 'feed.xml']:
        if not (ROOT / name).exists():
            missing.append(name)
    return missing


def git_commit_and_push(message: str) -> None:
    run(['git', 'add', '-A'])
    # commit may fail with non-zero exit if nothing to commit; handle gracefully
    try:
        run(['git', 'commit', '-m', message])
    except subprocess.CalledProcessError:
        print('No changes to commit.')
    run(['git', 'pull', '--rebase'])
    run(['git', 'push'])


def main() -> int:
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--no-git', action='store_true', help='Disable Git operations inside generator')
    ap.add_argument('--dry-run', action='store_true', help='Do not commit/push in this script')
    args = ap.parse_args()

    generate(no_git=args.no_git)

    problems = validate_index_json()
    if problems:
        print('Validation problems:')
        for p in problems:
            print(' -', p)
        return 2

    missing = ensure_seo_files()
    if missing:
        print('Missing SEO files:', ', '.join(missing))
        return 3

    if not args.dry_run and args.no_git:
        # If generator was run with --no-git, perform commit/push here
        git_commit_and_push('chore(publish): publish via publish.py')

    print('Publish completed successfully.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

