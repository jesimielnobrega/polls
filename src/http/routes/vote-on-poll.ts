import { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { redis } from "../../lib/redis";
import { voting } from "../../utils/voting-pub-sub";

export async function voteOnPoll(app: FastifyInstance) {
  app.post("/polls/:pollId/votes", async (request, reply) => {
    const voteOnpollBody = z.object({
      pollOptionsId: z.string().uuid(),
    });

    const voteOnPollParams = z.object({
      pollId: z.string().uuid(),
    });

    const { pollOptionsId } = voteOnpollBody.parse(request.body);
    const { pollId } = voteOnPollParams.parse(request.params);

    let { sessionId } = request.cookies;

    if(sessionId){
      const userPreviusVoteOnPoll = await prisma.vote.findUnique({
        where:{
          sessionId_pollId:{
            sessionId,
            pollId
          }
        }
      })

      if(userPreviusVoteOnPoll && userPreviusVoteOnPoll.pollOptionsId !== pollOptionsId){
        await prisma.vote.delete({
          where:{
            id: userPreviusVoteOnPoll.id
          }
        })
        
        const votes = await redis.zincrby(pollId, -1, userPreviusVoteOnPoll.pollOptionsId)

        voting.publish(pollId, {
          pollOptionId: userPreviusVoteOnPoll.pollOptionsId,
          votes: Number(votes)
        })
      }
      else if(userPreviusVoteOnPoll){
        return reply.status(400).send({mesage: "You already voted on this poll´s option."})
      }
    }

    if (!sessionId) {
      sessionId = randomUUID();
      reply.setCookie("sessionId", sessionId, {
        path: "/",
        maxAge: (60 * 60 * 24 * 30), //30 days
        signed: true,
        httpOnly: true
      });
    }
    await prisma.vote.create({
      data:{
        sessionId,
        pollId,
        pollOptionsId
      }
    })
    const votes = await redis.zincrby(pollId, 1 , pollOptionsId)

    voting.publish(pollId, {
      pollOptionId: pollOptionsId,
      votes: Number(votes)
    })

    return reply.status(201).send(`Voto Feito! id: ${sessionId}`);
  });
}
