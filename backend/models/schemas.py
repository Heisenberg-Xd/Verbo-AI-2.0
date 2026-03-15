from pydantic import BaseModel
from typing import List, Optional

class ProcessRequest(BaseModel):
    file_paths:   List[str]
    workspace_id: Optional[str] = None
