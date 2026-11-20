# Contexto — Chat RAG

Chat pequeño en React para consultar documentos `.txt` con una API de IA compatible con OpenAI.

## Iniciar

1. Instala Node.js 20 o superior.
2. Ejecuta `npm install`.
3. Copia `.env.example` a `.env` y agrega tu clave de API.
4. Ejecuta `npm run dev` y abre http://localhost:5173.

La clave se usa únicamente en el servidor. Los documentos se guardan en memoria y se borran al reiniciar el servidor. La recuperación usa coincidencia simple de palabras, adecuada para esta demo de clase.
