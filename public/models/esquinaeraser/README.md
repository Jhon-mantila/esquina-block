# Modelos de Esquina Eraser

Un solo archivo. No está en git (unos 199 MB).

```bash
bash scripts/fetch-eraser-models.sh
```

| Archivo | Origen | Tamaño | SHA256 |
| --- | --- | --- | --- |
| `lama_webgpu.onnx` | [toolsmonk/lama-webgpu](https://huggingface.co/toolsmonk/lama-webgpu) | 209 033 286 bytes | `75ddeeb344ca4603b261b09fce0e9323e17872042907f5ee205c9875464c8e3b` |

Pesos de [advimman/lama](https://github.com/advimman/lama) (Apache-2.0). El grafo parte de [Carve/LaMa-ONNX](https://huggingface.co/Carve/LaMa-ONNX) y toolsmonk lo reescribió para el proveedor WebGPU de ONNX Runtime Web. La ficha describe entradas `image` `[1, 3, 512, 512]` en 0..1 y `mask` `[1, 1, 512, 512]` con 1 en la zona a rellenar. La salida `output` está en 0..255.

Si el archivo no está en este directorio, el navegador lo pide a Hugging Face, igual que el resto de herramientas.
