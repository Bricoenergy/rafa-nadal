"""Generate the app's voice clips with the local Estudio creativo (Chatterbox V3).

Run with the studio's embedded Python:
  <Estudio_creativo>/ComfyUI_windows_portable/python_embeded/python.exe tools/gen_voices.py jobs.json

jobs.json: {"out": "audio", "ref": optional reference wav, "items": [{"text":..., "lang":"en"|"es", "file":"en/brain.mp3", "kind":"word"|"sentence"}]}
Existing files are skipped, so the script can be re-run after adding phrases.
"""
import json, os, sys, subprocess, re
from pathlib import Path

STUDIO = Path(os.environ.get("ESTUDIO_CREATIVO", r"C:\Users\fherr\AppData\Local\OllamaPortable\Aplicaciones_Extra\Estudio_creativo"))
sys.path.insert(0, str(STUDIO / "voice_dependencies"))
os.environ.update(HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", HF_HOME=str(STUDIO / "audio_cache"))
import torch, soundfile as sf, numpy as np
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

FFMPEG = next((STUDIO / "audio_dependencies/imageio_ffmpeg/binaries").glob("ffmpeg*.exe"))


def trim(wav, sr, thr=0.012, pad=0.06):
    """Cut leading/trailing silence (and the odd breath tail Chatterbox leaves)."""
    a = np.abs(wav)
    win = int(sr * 0.02)
    env = np.convolve(a, np.ones(win) / win, mode="same")
    idx = np.where(env > thr)[0]
    if len(idx) == 0:
        return wav
    s = max(0, idx[0] - int(pad * sr)); e = min(len(wav), idx[-1] + int(pad * 2 * sr))
    return wav[s:e]


def main():
    spec = json.loads(Path(sys.argv[1]).read_text("utf-8"))
    out = Path(spec["out"]); out.mkdir(parents=True, exist_ok=True)
    models = {}
    torch.manual_seed(spec.get("seed", 1234))
    for n, it in enumerate(spec["items"]):
        target = out / it["file"]
        if target.exists():
            continue
        lang = it["lang"]
        t3 = "t3_es_es.safetensors" if lang == "es" else "t3_mtl23ls_v3.safetensors"
        if t3 not in models:
            models.clear(); torch.cuda.empty_cache()
            models[t3] = ChatterboxMultilingualTTS.from_local(STUDIO / "modelos/audio/chatterbox-v3", device="cuda", t3_model=t3)
        m = models[t3]
        text = it["text"]
        # single words read better as a short, complete utterance
        if it.get("kind") == "word" and not re.search(r"[.!?]$", text):
            text = text + "."
        ref = it.get("ref") or spec.get("ref")
        torch.manual_seed(spec.get("seed", 1234) + n)
        wav = m.generate(text, language_id=lang, audio_prompt_path=ref,
                         exaggeration=spec.get("exaggeration", .45), cfg_weight=spec.get("cfg_weight", .5),
                         temperature=spec.get("temperature", .7)).squeeze().cpu().numpy()
        wav = trim(wav, m.sr)
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(".tmp.wav"); sf.write(tmp, wav, m.sr, subtype="PCM_16")
        subprocess.run([str(FFMPEG), "-hide_banner", "-nostdin", "-y", "-i", str(tmp), "-af", "loudnorm=I=-16:TP=-1.5",
                        "-ar", "44100", "-ac", "1", "-b:a", "64k", str(target)], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        tmp.unlink()
        print(f"[{n+1}/{len(spec['items'])}] {it['file']}  {len(wav)/m.sr:.2f}s", flush=True)


if __name__ == "__main__":
    main()
