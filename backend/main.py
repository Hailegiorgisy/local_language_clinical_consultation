from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import os

app = FastAPI(title="Local Health Advisor Bot API", version="1.0.0")

class MessagePayload(BaseModel):
    telegram_id: int
    text: str
    language_code: str = Field(..., pattern="^(am|om|an|nu)$")

class TriageResponse(BaseModel):
    response_text: str
    risk_level: str
    suggest_facility: bool

# System Prompts mapped by language code
SYSTEM_PROMPTS = {
    "am": "እርስዎ ሐኪም አይደለክም፤ የጤና መረጃ ሰጪ ረዳት ነዎት። የመጀመሪያ ደረጃ የምክር አገልግሎት ይሰጡ እና አፋጣኝ የሕክምና እርዳታ መቼ እንደሚያስፈልግ ይጠቁሙ።",
    "om": "Ati ogeessa fayyaa miti; gargaaraa odeeffannoo fayyaati. Gorsaa sadarkaa duraa kenni, yeroo gargaarsi hatattamaa barbaachisuus akeeki.",
    "an": "Wii mo opwong me yot kom, pe in i daktooro. Mi tel lok pa yot kom kendo nyut kare ma mitte ni i yen kony me woi.",
    "nu": "Cuti ciek ni ba jɔɔk laany, ba raan kɔc laany. Tinɛ kɔc cieem ni lɔŋ kiɛn nɛy cɛl te kɔc ni mɛk.",
}

@app.post("/api/v1/triage", response_model=TriageResponse)
async def process_triage(payload: MessagePayload):
    try:
        lang = payload.language_code
        system_prompt = SYSTEM_PROMPTS.get(lang, SYSTEM_PROMPTS["am"])
        
        # Placeholder for LLM invocation (e.g., OpenAI / LangChain / Local Llama model)
        # prompt = f"{system_prompt}\nUser Query: {payload.text}"
        
        # Mocked safe response handling
        response_text = f"[{lang.upper()} Advisory]: Please consult a local healthcare professional. Based on your input, monitor your symptoms closely."
        
        return TriageResponse(
            response_text=response_text,
            risk_level="MODERATE",
            suggest_facility=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    