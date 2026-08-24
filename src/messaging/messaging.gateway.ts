import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service';

interface AuthedSocket extends Socket {
  data: { userId: string };
}

/**
 * Socket.IO gateway backing real-time chat. Clients join a room per
 * conversationId; sending a message over HTTP (POST /conversations/:id/messages)
 * both persists it and emits `message:new` to that room, so the sender's
 * other devices and the recipient get it live without polling. The Redis
 * adapter (wired in main.ts) makes this work across multiple backend
 * instances behind a load balancer.
 */
@WebSocketGateway({ namespace: '/ws', cors: { origin: true, credentials: true } })
export class MessagingGateway implements OnGatewayConnection {
  private readonly logger = new Logger(MessagingGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private messagingService: MessagingService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = extractToken(client);
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.config.get<string>('jwt.accessSecret'),
      });
      (client as AuthedSocket).data.userId = payload.sub;
    } catch (err) {
      this.logger.warn(`WebSocket auth failed: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  @SubscribeMessage('conversation:join')
  async handleJoin(@ConnectedSocket() client: AuthedSocket, @MessageBody() data: { conversationId: string }) {
    await this.messagingService.assertParticipant(client.data.userId, data.conversationId);
    await client.join(roomFor(data.conversationId));
    return { ok: true };
  }

  @SubscribeMessage('conversation:leave')
  handleLeave(@ConnectedSocket() client: AuthedSocket, @MessageBody() data: { conversationId: string }) {
    client.leave(roomFor(data.conversationId));
    return { ok: true };
  }

  /** Called by MessagingController right after a message is persisted via HTTP. */
  emitNewMessage(conversationId: string, message: unknown): void {
    this.server.to(roomFor(conversationId)).emit('message:new', message);
  }
}

function roomFor(conversationId: string): string {
  return `conversation:${conversationId}`;
}

function extractToken(client: Socket): string {
  const authToken = client.handshake.auth?.token as string | undefined;
  const headerToken = client.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
  const token = authToken ?? headerToken;
  if (!token) throw new Error('No token provided in handshake.');
  return token;
}
