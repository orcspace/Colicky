#!/usr/bin/env python3
"""Apply conservative, repeatable project-file repairs to ILSpy output."""
import xml.etree.ElementTree as ET
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for source in (ROOT / 'Source').rglob('*.cs'):
    if 'obj' in source.parts or 'bin' in source.parts:
        continue
    text = source.read_text(encoding='utf-8-sig')
    # ILSpy retained generated implementations; regenerating them creates errors.
    text = re.sub(r'^\s*\[(?:GeneratedRegex|LibraryImport)\([^\n]*\)\]\n', '\n', text, flags=re.M)
    text = re.sub(r'^\[module: RefSafetyRules\([^\n]*\n', '', text, flags=re.M)
    # Parenthesize a with-expression before invoking a method on its result.
    text = re.sub(r'(?<!\()p\.Flags with\n\t\t\{', '(p.Flags with\n\t\t{', text).replace('}.Write(writer);', '}).Write(writer);')
    # These properties are written after cloning in the recovered IL. Preserve
    # those writes while expressing them with C# setters (see recovery notes).
    mutable = {
        'OneBrainStats.cs': ['IdleMinutesBefore'],
        'ClickyInkGroup.cs': ['Blocks'],
        'ClickyInkFrontPagePlanner.cs': ['LastStoryID', 'OverflowNames', 'Fits', 'LeadFallbackTitle'],
        'ProactiveSuggestionCard.cs': ['ClickySlug', 'NewClicky', 'Routine', 'IntegrationName', 'CreatedAt'],
        'ClickyWorkPiece.cs': ['Title', 'Summary', 'Reply', 'ArtifactPaths', 'FinishedAt', 'IsRoutineRun'],
        'ClickyAnswer.cs': ['Better'],
        'ClickyJob.cs': ['Runs'],
        'ClickyJobRun.cs': ['Summary'],
        'AgentHarnessTurnContext.cs': ['WritesNoteWithTools', 'UsesPlanTool'],
        'ArcCardContent.cs': ['TaskIsRunning', 'Request', 'ReadyOutput', 'LiveLine', 'Answer', 'IsFinalizing', 'NotePath'],
        'ChatTaskEnd.cs': ['CompletedAssistantMessages', 'UserFacingArtifactPaths', 'SuggestedNextActions', 'FinalAnswer', 'IsScheduledRoutineRun', 'CompletedThreadName'],
        'ProactiveRequestInputs.cs': ['ReadsForMorningPaper', 'ExistingRoutines'],
        'CustomConnector.cs': ['TokenFromSignIn'],
        'ClickyInkSheetRowInfo.cs': ['CollapsedBelow', 'CollapsedAbove'],
        'CompanionSessionOptions.cs': ['OutputSilenceKind', 'IsOnboardingTutorialRestrictingNormalUse', 'UsageContext', 'LiveStateNote', 'TurnFlow', 'SnapTargetToControl', 'ActivePage', 'ClientTools', 'IsVoiceMuted', 'IsBrainMuted', 'Tools', 'OnScreenshots', 'OnUserText'],
    }
    for name in mutable.get(source.name, []):
        text = re.sub(r'(\b' + name + r'\s*\{\s*get;\s*)init;', r'\1set;', text)
    if source.name == 'RemoteTaskReportBlock.cs':
        text = text.replace('bullet.DetailLines = detailLines.Append(element).ToList();', 'bullet = bullet with { DetailLines = detailLines.Append(element).ToList() };')
    if source.name == 'ClickyInkDashboardSplit.cs':
        text = re.sub(r'(\b\w+)\.(Left|Right) = ([^;\n]+);', r'\1 = \1 with { \2 = \3 };', text)
    if source.name == 'AppSettings.cs':
        text = text.replace('\t\tbase._002Ector();\n', '')
    if source.name == 'BrainSseParser.cs':
        text = text.replace('scoped ref ReadOnlySpan<byte> reference;', 'scoped ref ReadOnlySpan<byte> reference = ref line;')
    if source.name == 'BrainSession.cs':
        old = 'foreach (JsonNode item in jsonArray)\n\t\t\t{\n\t\t\t\tif (toDrop > 0 && IsScreenshotBlock(item))'
        new = 'foreach (JsonNode screenshotItem in jsonArray)\n\t\t\t{\n\t\t\t\tif (toDrop > 0 && IsScreenshotBlock(screenshotItem))'
        text = text.replace(old, new).replace('jsonArray2.Add(item.DeepClone());', 'jsonArray2.Add(screenshotItem.DeepClone());')
    if source.name in ('RoutinesTool.cs', 'ClickyTourJob.cs'):
        function_name = 'Text' if source.name == 'RoutinesTool.cs' else 'Str'
        pattern = r'\t\t\tstring\? ' + function_name + r'\(string key\)\n\t\t\t\{.*?\n\t\t\t\}\n'
        match = re.search(pattern, text, re.S)
        if match:
            function = '\n'.join(line[1:] if line.startswith('\t') else line for line in match[0].split('\n'))
            text = text[:match.start()] + text[match.end():]
            anchor = '\t\tint? num;' if function_name == 'Text' else '\t\tif (o == null)'
            text = text.replace(anchor, function + anchor, 1)
    if source.name == 'TextShaper.cs':
        pattern = r'\t\tglobal::_003C_003Ey__InlineArray5<string> buffer = .*?\n\t\tstring key = [^\n]+;'
        text = re.sub(pattern, '\t\tstring key = string.Concat(cssFamilyList, "|", size.ToString("R", CultureInfo.InvariantCulture), "|", weight.ToString());', text, flags=re.S)
    if source.name == 'PhotoLoader.cs':
        text = text.replace('int num;\n\t\t_ = num - 1;', 'int num = 0;\n\t\t_ = num - 1;')
    if source.name == 'PenStroke.cs':
        # Recovered callers assign these fields immediately after construction.
        text = text.replace('public required ', 'public ')
    if source.name == 'J.cs' and source.parent.name == 'HeyClicky.Drawing3D':
        text = text.replace('bool flag = e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out value);', 'value = default;\n\t\tbool flag = e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out value);') if 'value = default;\n\t\tbool flag' not in text else text
    if source.name == 'Pipelines.cs':
        text = re.sub(r'(?<![\w.])Blend\.', 'Vortice.Direct3D11.Blend.', text)
    if source.name == 'InkTextView.cs':
        text = text.replace('value.Right = Math.Max(list[list.Count - 1].Right, item.Right);', 'value = value with { Right = Math.Max(list[list.Count - 1].Right, item.Right) };')
    if source.name == 'ClickyInkSheetView.cs':
        text = text.replace('double? PageSettledAt = null);', 'double? PageSettledAt = null) { public ClickyInkSheetRowInfo Info { get; set; } = Info; }')
    if source.name == 'ClickyInkSheetRowInfo.cs' and 'CollapsedAbove { get; set; }' not in text:
        text = text.replace('\t\tpublic Row(IReadOnlyList<string> placeIDs', '\t\tpublic IReadOnlyList<string> CollapsedAbove { get; set; } = CollapsedAbove;\n\t\tpublic IReadOnlyList<string> CollapsedBelow { get; set; } = CollapsedBelow;\n\t\tpublic Row(IReadOnlyList<string> placeIDs')
    if source.name == 'ScreenGrab.cs' and 'using System;\n' not in text:
        text = 'using System;\n' + text
    if source.name == 'CompanionSessionOptions.cs':
        text = text.replace('get; init;', 'get; set;')
    source.write_text(text, encoding='utf-8')
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
            elif name.startswith('HeyClicky'):
                group.remove(reference)
                ET.SubElement(group, 'ProjectReference', Include='../' + name + '/' + name + '.csproj')
            else:
                hint = reference.find('HintPath')
                if hint is not None:
                    hint.text = '../../.cache/original/lib/app/' + name + '.dll'
    ET.indent(tree)
    tree.write(project, encoding='unicode')
