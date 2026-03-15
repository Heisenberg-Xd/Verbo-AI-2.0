import re
import logging
from typing import List
from deep_translator import GoogleTranslator
from config.settings import TRANSLATE_CHUNK_SIZE

logger = logging.getLogger(__name__)

def _chunk_text(text: str, size: int = TRANSLATE_CHUNK_SIZE) -> List[str]:
    chunks, current, length = [], [], 0
    for sentence in re.split(r'(?<=[।.!?])\s+', text):
        if length + len(sentence) > size and current:
            chunks.append(' '.join(current))
            current, length = [], 0
        current.append(sentence)
        length += len(sentence)
    if current:
        chunks.append(' '.join(current))
    return chunks or [text]

def translate_to_english(text: str, lang: str) -> str:
    if lang in ('en', 'unknown'):
        return text
    try:
        translator = GoogleTranslator(source=lang, target='en')  # one instance per call
        parts = []
        for chunk in _chunk_text(text):
            try:
                result = translator.translate(chunk)
                if result and result.strip():
                    parts.append(result)
                else:
                    logger.warning(f"Empty translation for lang={lang}, returning original text")
                    return text  # abort — don't mix translated + untranslated
            except Exception as e:
                logger.warning(f"Chunk translation failed for lang={lang}: {e}")
                return text  # abort cleanly, don't silently mix
        return ' '.join(parts)
    except Exception as e:
        logger.error(f"Translation init failed for lang={lang}: {e}")
        return text