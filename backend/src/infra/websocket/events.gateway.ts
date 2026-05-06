import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.query.token as string;
    try {
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    client.rooms.forEach((room) => client.leave(room));
  }

  @SubscribeMessage('join.project')
  handleJoinProject(client: Socket, payload: { projectId: string }) {
    client.join(`project:${payload.projectId}`);
  }

  @SubscribeMessage('leave.project')
  handleLeaveProject(client: Socket, payload: { projectId: string }) {
    client.leave(`project:${payload.projectId}`);
  }

  emit(event: string, payload: unknown, room?: string) {
    if (room) {
      this.server.to(room).emit(event, payload);
    } else {
      this.server.emit(event, payload);
    }
  }
}
