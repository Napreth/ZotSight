# Copyright (C) 2026 Napreth. AGPL-3.0-or-later.
$ErrorActionPreference = 'Stop'
$encoding = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $encoding
[Console]::OutputEncoding = $encoding
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$speechType = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$streamType = [Windows.Media.SpeechSynthesis.SpeechSynthesisStream, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$languageType = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
try {
    while ($null -ne ($line = [Console]::ReadLine())) {
        $request = $null
        try {
            $request = $line | ConvertFrom-Json
            if ($request.action -eq 'voices') {
                $defaultId = $speechType::DefaultVoice.Id
                $result = @{voices = @($speechType::AllVoices | ForEach-Object {
                    @{id = $_.Id; name = $_.DisplayName; language = $_.Language; languageName = $languageType::new($_.Language).DisplayName; default = $_.Id -eq $defaultId}
                })}
            }
            elseif ($request.action -eq 'synthesize') {
                if ($request.text -isnot [string] -or $request.text.Length -gt 50000) { throw 'Invalid speech text.' }
                $voice = $speechType::AllVoices | Where-Object { $_.Id -eq $request.voiceId } | Select-Object -First 1
                if ($null -eq $voice) { throw 'The selected Windows voice is unavailable.' }
                $synth.Voice = $voice
                $task = $asTask.MakeGenericMethod($streamType).Invoke($null, @($synth.SynthesizeTextToStreamAsync($request.text)))
                $stream = $task.GetAwaiter().GetResult()
                try {
                    if ($stream.Size -gt 32MB) { throw 'Speech audio exceeds the size limit.' }
                    $reader = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)
                    $memory = New-Object System.IO.MemoryStream
                    try {
                        $reader.CopyTo($memory)
                        $result = @{audio = [Convert]::ToBase64String($memory.ToArray())}
                    }
                    finally { $memory.Dispose(); $reader.Dispose() }
                }
                finally { $stream.Dispose() }
            }
            else { throw 'Unknown speech request.' }
            [Console]::WriteLine((@{id = $request.id; result = $result} | ConvertTo-Json -Depth 5 -Compress))
        }
        catch {
            [Console]::WriteLine((@{id = $request.id; error = $_.Exception.Message} | ConvertTo-Json -Compress))
        }
    }
}
finally { $synth.Dispose() }
