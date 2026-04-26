import asyncio
import uuid
from collections import defaultdict

from fastapi import WebSocket


class LiveConnectionManager:
    def __init__(self) -> None:
        self._channels: dict[str, set[WebSocket]] = defaultdict(set)
        self._heartbeat_task: asyncio.Task | None = None

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._join(channel, websocket)

    def _join(self, channel: str, websocket: WebSocket) -> None:
        self._channels[channel].add(websocket)
        if self._heartbeat_task is None or self._heartbeat_task.done():
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

    async def join(self, channel: str, websocket: WebSocket) -> None:
        """Add an already-accepted WebSocket to a channel without calling accept."""
        self._join(channel, websocket)

    def disconnect(self, channel: str, websocket: WebSocket) -> None:
        listeners = self._channels.get(channel)
        if not listeners:
            return
        listeners.discard(websocket)
        if not listeners:
            self._channels.pop(channel, None)

    async def broadcast(self, channel: str, payload: dict) -> None:
        listeners = list(self._channels.get(channel, set()))
        stale: list[WebSocket] = []
        for socket in listeners:
            try:
                await socket.send_json(payload)
            except Exception:
                stale.append(socket)

        for socket in stale:
            self.disconnect(channel, socket)

    async def _heartbeat_loop(self) -> None:
        while self._channels:
            await asyncio.sleep(30)
            all_channels = list(self._channels.keys())
            for channel in all_channels:
                await self.broadcast(channel, {"type": "ping"})


live_manager = LiveConnectionManager()


def match_channel(match_id: uuid.UUID) -> str:
    return f"match:{match_id}"


def session_channel(session_id: uuid.UUID) -> str:
    return f"session:{session_id}"
