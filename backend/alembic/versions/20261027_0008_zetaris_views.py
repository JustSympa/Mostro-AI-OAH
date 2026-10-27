"""Expose read-only, JDBC-friendly agent context for Zetaris.

Revision ID: 20261027_0008
Revises: 20261027_0007
"""

from alembic import op

revision = "20261027_0008"
down_revision = "20261027_0007"
branch_labels = None
depends_on = None


VIEWS = {
    "agent_ipos": """
        SELECT id::text AS id, company_name FROM ipos
    """,
    "agent_chunks": """
        SELECT c.id::text AS id, c.document_id::text AS document_id,
               c.ipo_id::text AS ipo_id, c.content, c.embedding::text AS embedding,
               c.embedding_model, c.page_number, c.section_path
        FROM chunks c JOIN documents d ON d.id = c.document_id AND d.ipo_id = c.ipo_id
        WHERE d.status = 'indexed' AND c.embedding IS NOT NULL
    """,
    "agent_profiles": """
        SELECT u.id::text AS user_id, u.preferred_language, p.risk_level,
               p.risk_label, p.applied_constraints::text AS applied_constraints
        FROM users u LEFT JOIN LATERAL (
            SELECT risk_level, risk_label, applied_constraints FROM risk_profiles
            WHERE user_id = u.id ORDER BY version DESC LIMIT 1
        ) p ON true
    """,
    "agent_knowledge": """
        SELECT s.user_id::text AS user_id, t.term, s.mastery_level,
               t.simple_explanation AS definition
        FROM user_knowledge_states s JOIN glossary_terms t ON t.id = s.glossary_term_id
    """,
    "agent_history": """
        SELECT m.id::text AS id, m.chat_session_id::text AS chat_session_id,
               s.user_id::text AS user_id, s.ipo_id::text AS ipo_id,
               m.sender, m.content, m.created_at
        FROM messages m JOIN chat_sessions s ON s.id = m.chat_session_id
    """,
    "agent_facts": """
        SELECT id::text AS id, ipo_id::text AS ipo_id, fact_type, value, source_page
        FROM key_facts WHERE review_status = 'verified'
    """,
    "agent_proposals": """
        SELECT p.key_fact_id::text AS key_fact_id, p.chat_session_id::text AS chat_session_id,
               s.user_id::text AS user_id
        FROM calendar_proposals p JOIN chat_sessions s ON s.id = p.chat_session_id
        WHERE p.status <> 'rejected' AND p.key_fact_id IS NOT NULL
    """,
}


def upgrade() -> None:
    for name, query in VIEWS.items():
        op.execute(f"CREATE VIEW {name} AS {query}")


def downgrade() -> None:
    for name in reversed(VIEWS):
        op.execute(f"DROP VIEW {name}")
