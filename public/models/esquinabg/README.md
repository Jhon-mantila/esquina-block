# Modelos Esquina BG

Documentación completa de la tool (pipeline, GA4, código): [`readme/esquinabg.md`](../../readme/esquinabg.md).

Los archivos `.onnx` no se versionan en git (pesan ~90 MB). Descárgalos con:

```bash
bash scripts/fetch-bg-models.sh
```

Quedarán en esta carpeta:

| Archivo | Uso en la UI |
| --- | --- |
| `u2netp.onnx` | Rápido |
| `isnet-quantized.onnx` | Equilibrado |
| `rmbg-quantized.onnx` | Alta Calidad |
