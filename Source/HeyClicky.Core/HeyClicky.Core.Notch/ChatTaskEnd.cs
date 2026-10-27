using System;
using System.Collections.Generic;
using System.Text.Json.Nodes;

namespace HeyClicky.Core.Notch;

public sealed record ChatTaskEnd
{
	public string? JobId { get; init; }

	public string? ClickySlug { get; init; }

	public string? ThreadId { get; init; }

	public bool IsDemo { get; init; }

	public string? PendingComputerUseRequest { get; init; }

	public string? PendingUserStep { get; init; }

	public bool NeedsChromeConnection { get; init; }

	public string? FinalSummary { get; init; }

	public string? FinalResponseMarkdown { get; init; }

	public IReadOnlyList<string> CompletedAssistantMessages { get; set; } = Array.Empty<string>();

	public IReadOnlyList<string> UserFacingArtifactPaths { get; set; } = Array.Empty<string>();

	public JsonObject? FinalAnswer { get; set; }

	public IReadOnlyList<string> SuggestedNextActions { get; set; } = Array.Empty<string>();

	public bool IsScheduledRoutineRun { get; set; }

	public string? CompletedThreadName { get; set; }
}
