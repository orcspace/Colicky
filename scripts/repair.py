#!/usr/bin/env python3
"""Apply conservative, repeatable project-file repairs to ILSpy output."""
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for project in (ROOT / 'Source').glob('*/*.csproj'):
    tree = ET.parse(project)
    root = tree.getroot()
    properties = root.find('PropertyGroup')
    properties.find('TargetFramework').text = 'net9.0'
    nullable = properties.find('Nullable')
    if nullable is None:
        nullable = ET.SubElement(properties, 'Nullable')
    nullable.text = 'annotations'
    for group in root.findall('ItemGroup'):
        for reference in list(group):
            if reference.tag != 'Reference':
                continue
            name = reference.attrib['Include']
            if (name.startswith('System.') and name != 'System.Security.Cryptography.ProtectedData') or name == 'System':
                group.remove(reference)
            elif name == 'HeyClicky.Contracts':
                group.remove(reference)
                ET.SubElement(group, 'ProjectReference', Include='../HeyClicky.Contracts/HeyClicky.Contracts.csproj')
            else:
                hint = reference.find('HintPath')
                if hint is not None:
                    hint.text = '../../.cache/original/lib/app/' + name + '.dll'
    ET.indent(tree)
    tree.write(project, encoding='unicode')
