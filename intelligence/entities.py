from typing import List

from .schemas import EntityResult, NormalizedEvent


class EntityResolver:
    """
    Extracts deterministic entities from a normalized event.

    Supported entity types:
    USER
    DEVICE
    IP
    SESSION
    RESOURCE
    APPLICATION
    """

    def resolve(self, event: NormalizedEvent) -> List[EntityResult]:
        entities: List[EntityResult] = []

        self._add_entity(
            entities,
            entity_type="USER",
            value=event.user_id,
        )

        self._add_entity(
            entities,
            entity_type="DEVICE",
            value=event.device_id,
        )

        self._add_entity(
            entities,
            entity_type="IP",
            value=event.ip_address,
        )

        self._add_entity(
            entities,
            entity_type="SESSION",
            value=event.session_id,
        )

        self._add_entity(
            entities,
            entity_type="RESOURCE",
            value=event.resource,
        )

        application = self._extract_application(event)

        self._add_entity(
            entities,
            entity_type="APPLICATION",
            value=application,
        )

        return entities

    def _add_entity(
        self,
        entities: List[EntityResult],
        entity_type: str,
        value: str | None,
    ) -> None:

        if not value:
            return

        entities.append(
            EntityResult(
                entity_id=value,
                entity_type=entity_type,
                value=value,
            )
        )

    def _extract_application(
        self,
        event: NormalizedEvent,
    ) -> str | None:

        metadata = event.metadata or {}

        application = metadata.get("application")

        if application:
            return str(application)

        return None


def resolve_entities(
    event: NormalizedEvent,
) -> List[EntityResult]:

    resolver = EntityResolver()

    return resolver.resolve(event)