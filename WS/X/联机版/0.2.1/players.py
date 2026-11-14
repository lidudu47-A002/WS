import asyncio
import websockets
import json

clients = {}
next_id = 1

async def handler(websocket):
    global next_id
    client_id = next_id
    next_id += 1
    clients[client_id] = websocket
    print(f"客户端 {client_id} 已连接")

    # 发送当前所有玩家信息（初始位置统一为 (0, 地面Y)）
    players_info = {}
    for cid, ws in clients.items():
        if cid != client_id:
            # 其他玩家的初始位置（将在后续更新中覆盖）
            players_info[cid] = {"x": 0, "y": 0, "facing": 1, "hp": 100}
    await websocket.send(json.dumps({"type": "init", "players": players_info, "yourId": client_id}))

    # 广播新玩家加入（其他客户端需要知道新玩家，但位置后续通过update同步）
    await broadcast({"type": "join", "playerId": client_id}, exclude=client_id)

    try:
        async for message in websocket:
            data = json.loads(message)
            if data["type"] == "update":
                # 转发玩家状态给所有其他客户端
                await broadcast({"type": "update", "id": client_id, "state": data["state"]}, exclude=client_id)
            elif data["type"] == "attack":
                await broadcast({"type": "attack", "id": client_id, "rect": data["rect"]}, exclude=client_id)
    except:
        pass
    finally:
        del clients[client_id]
        await broadcast({"type": "leave", "id": client_id})
        print(f"客户端 {client_id} 断开")

async def broadcast(message, exclude=None):
    for cid, ws in clients.items():
        if cid != exclude:
            try:
                await ws.send(json.dumps(message))
            except:
                pass

async def main():
    async with websockets.serve(handler, "0.0.0.0", 8765):
        print("WebSocket 服务器已启动，端口 8765")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())