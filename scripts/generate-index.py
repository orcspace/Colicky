from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
rows = ['# Индекс восстановленного кода\n', 'Файлы и публичные объявления. Это индекс навигации, не проверенный API-контракт.\n']
for source in sorted((root / 'Source').rglob('*.cs')):
    if 'obj' in source.parts or 'bin' in source.parts:
        continue
    text = source.read_text(encoding='utf-8-sig')
    namespace = re.search(r'^namespace ([^;{]+)', text, re.M)
    declarations = [line.strip() for line in text.splitlines() if re.match(r'\s*public\s', line)]
    rows.append('## ' + str(source.relative_to(root)) + '\n')
    if namespace:
        rows.append('Namespace: `' + namespace[1] + '`\n')
    rows.append('```csharp\n' + '\n'.join(declarations) + '\n```\n')
(root / 'docs').mkdir(exist_ok=True)
(root / 'docs' / 'SOURCE_INDEX.md').write_text('\n'.join(rows), encoding='utf-8')
