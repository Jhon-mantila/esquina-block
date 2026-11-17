# Modelos Esquina Upscale

Los archivos `.onnx` no se versionan. Descárgalos con:

```bash
bash scripts/fetch-upscale-models.sh
```

| Archivo | Uso | Origen | Licencia |
| --- | --- | --- | --- |
| `realesr-general-x4v3.onnx` | Ligero, 4× | Pesos oficiales [xinntao/Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN), exportación [CoderViking/realesr-general-x4v3-onnx](https://huggingface.co/CoderViking/realesr-general-x4v3-onnx) | BSD-3-Clause |
| `realesrgan-x4plus.onnx` | Alta calidad, 4× | Pesos oficiales `RealESRGAN_x4plus`, exportación [othytenk/realesrgan-x4plus](https://huggingface.co/othytenk/realesrgan-x4plus) | BSD-3-Clause |

Entrada: RGB en planos, valores de 0 a 1, alto y ancho variables. Salida: la misma imagen a 4×. El navegador la parte en bloques con solape.
