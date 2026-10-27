using System.Text;
using System.Text.Json;
using HeyClicky.Core.Brain;
using HeyClicky;

// Exercise a repaired parser with network chunks splitting UTF-8 and CRLF.
var bytes = Encoding.UTF8.GetBytes("data: {\"type\":\"probe\",\"value\":\"Привет 🌍\"}\r\n\n");
for (var boundary = 0; boundary <= bytes.Length; boundary++)
{
    using var parser = new BrainSseParser();
    var sink = new Sink();
    parser.Feed(bytes.AsSpan(0, boundary), sink);
    parser.Feed(bytes.AsSpan(boundary), sink);
    parser.Complete(sink);
    if (sink.Events != 1 || sink.Value != "Привет 🌍")
        throw new Exception($"SSE chunk boundary {boundary} changed the message");
}
using (var parser = new BrainSseParser())
{
    var sink = new Sink();
    parser.Feed(Encoding.UTF8.GetBytes("data: {\"type\":\"probe\",\"value\":\"last\"}"), sink);
    if (sink.Events != 0) throw new Exception("Partial line dispatched too soon");
    parser.Complete(sink);
    if (sink.Events != 1 || sink.Value != "last") throw new Exception("Final line was lost");
}
if (!ShellOpenRules.IsWebUrl("https://example.com") || ShellOpenRules.IsWebUrl("file:///C:/test.txt"))
    throw new Exception("Web URL classification changed");
Console.WriteLine($"PASS: {bytes.Length + 1} SSE chunk boundaries, trailing line, URL classification");

sealed class Sink : IBrainStreamSink
{
    public int Events;
    public string? Value;
    public void OnText(ReadOnlySpan<char> text) { }
    public void OnEvent(string type, JsonElement root)
    {
        if (type != "probe") throw new Exception("Unexpected event");
        Events++;
        Value = root.GetProperty("value").GetString();
    }
}
