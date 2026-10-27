class AgentError(Exception):
    """Base exception for expected agent workflow failures."""


class RetrievalError(AgentError):
    """Raised when useful, sufficiently relevant prospectus evidence is unavailable."""


class RefusalError(AgentError):
    """Raised when the workflow must decline to answer."""


class ModelError(AgentError):
    """Raised when the configured language model cannot produce a response."""