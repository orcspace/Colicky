#!/usr/bin/env python3
"""Reproduce source recovery without executing the downloaded application."""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://github.com/heyclicky/clicky-releases-windows/releases/download/v1.1.3/HeyClickyApp-win-x64-Setup.exe'
SHA256 = 'f29277ef315ec3d49301db4a101739df91a59de59457a9715a01626959f7d562'
ASSEMBLIES = ['HeyClicky.Contracts', 'HeyClicky.Core', 'HeyClicky.Platform', 'HeyClicky.Drawing', 'HeyClicky.Drawing3D', 'HeyClicky.Agents', 'HeyClicky']

def prepare():
    cache = ROOT / '.cache'
    cache.mkdir(exist_ok=True)
    installer = cache / 'HeyClickyApp-win-x64-Setup.exe'
    if not installer.exists():
        with urllib.request.urlopen(URL, timeout=120) as response, installer.with_suffix('.part').open('wb') as output:
            shutil.copyfileobj(response, output)
        installer.with_suffix('.part').replace(installer)
    if hashlib.sha256(installer.read_bytes()).hexdigest() != SHA256:
        raise SystemExit('Installer SHA-256 mismatch; nothing will be extracted.')
    destination = cache / 'original'
    with zipfile.ZipFile(installer) as archive:
        for member in archive.infolist():
            path = destination / member.filename
            if not path.resolve().is_relative_to(destination.resolve()):
                raise SystemExit('Unsafe archive member')
        archive.extractall(destination)
    return destination / 'lib' / 'app'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--prepare-only', action='store_true')
    parser.add_argument('--decompiler', default='ilspycmd')
    parser.add_argument('--fallback-decompiler')
    parser.add_argument('--fill-missing', action='store_true')
    args = parser.parse_args()
    app = prepare()
    if args.prepare_only:
        print('Verified original runtime:', app)
        return
    source = ROOT / 'Source'
    if source.exists() and not args.fill_missing:
        raise SystemExit('Source already exists. Preserve your edits or move it before re-decompiling.')
    for assembly in ASSEMBLIES:
        if not args.fill_missing:
            subprocess.run([args.decompiler, '-p', '-o', str(source / assembly), '-r', str(app), str(app / (assembly + '.dll'))], check=True)
        if args.fallback_decompiler:
            fallback = ROOT / '.cache' / 'fallback' / assembly
            subprocess.run([args.fallback_decompiler, '-p', '-o', str(fallback), '-r', str(app), str(app / (assembly + '.dll'))], check=True, env=dict(os.environ, DOTNET_ROLL_FORWARD='Major'))
            for original in fallback.rglob('*'):
                if original.is_file():
                    recovered = source / assembly / original.relative_to(fallback)
                    if not recovered.exists() or recovered.stat().st_size == 0:
                        recovered.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(original, recovered)
    for name in ['Assets', 'BundledResources', 'ClickyBrowserExtension']:
        shutil.copytree(app / name, ROOT / name, dirs_exist_ok=True)
    for name in ['HeyClicky.deps.json', 'HeyClicky.runtimeconfig.json']:
        shutil.copy2(app / name, ROOT / name)
    subprocess.run(['python', str(ROOT / 'scripts' / 'repair.py')], check=True)
    (ROOT / 'recovery.json').write_text(json.dumps({
        'installer_url': URL, 'installer_sha256': SHA256,
        'decompiler': 'ILSpy 11.2.0.10050', 'assemblies': ASSEMBLIES,
        'csharp_files': len(list(source.rglob('*.cs'))),
        'status': 'Recovered source; see docs/RECOVERY.md for build verification.'
    }, indent=2) + '\n')
    print('Recovered', len(list(source.rglob('*.cs'))), 'C# source files')

if __name__ == '__main__':
    main()
