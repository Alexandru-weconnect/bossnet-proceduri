export interface SessionUser {
  email: string;
  id: string;
  name: string;
  systemRole: "admin" | "editor";
}

declare module "fastify" {
  interface FastifyRequest {
    bossnetUser: SessionUser | null;
  }
}
