import { FastifyInstance } from "fastify";
import { z } from "zod";
import { voting } from "../../utils/voting-pub-sub";

export async function pollResults(app: FastifyInstance) {
  app.get("/polls/:pollId/results", { websocket: true }, (connection, req) => {
    //Inscrever apenas nas mensagens publicadas no canal com o ID da enquete ('pollId')
    const getPollParams = z.object({
      pollId: z.string().uuid(),
    });

    const { pollId } = getPollParams.parse(req.params);

    voting.subscribe(pollId,(message)=>{
      connection.socket.send(JSON.stringify(message))
    })
  });
}
